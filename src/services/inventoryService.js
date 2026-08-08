const StockTransaction = require('../models/StockTransaction');
const StockLevel = require('../models/StockLevel');
const InventoryItem = require('../models/InventoryItem');
const Lot = require('../models/Lot');
const Serial = require('../models/Serial');
const ProductVariant = require('../models/ProductVariant');

function checkRole(user) {
  const allowedRoles = ['Super CRM Administrator', 'System Architect', 'Inventory Manager', 'Warehouse Manager'];
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('Not authorized for inventory operations');
  }
}

function generateId(prefix) {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

async function getOrCreateStockLevel(itemId, warehouseId, subinventory = 'MAIN', locator = '', lotNumber = '', serialNumber = '') {
  const stockLevel = await StockLevel.findOne({ item: itemId, warehouse: warehouseId, subinventory, locator, lotNumber, serialNumber });
  if (stockLevel) return stockLevel;

  const newStockLevel = await StockLevel.create({
    item: itemId,
    warehouse: warehouseId,
    subinventory,
    locator,
    lotNumber,
    serialNumber,
    onHand: 0,
    available: 0,
    allocated: 0,
    reserved: 0,
    blocked: 0,
    inTransit: 0
  });

  return newStockLevel;
}

async function postTransaction(payload) {
  const doc = await StockTransaction.create({
    ...payload,
    performedBy: payload.performedBy || payload.user || null,
    status: payload.status || 'Posted'
  });
  return doc;
}

async function updateStockLevel(stockLevel, delta, type) {
  const quantity = Number(delta) || 0;
  const updated = await StockLevel.findById(stockLevel._id);
  if (!updated) return null;

  updated.onHand = Math.max(0, (updated.onHand || 0) + quantity);
  updated.available = Math.max(0, (updated.available || 0) + quantity);
  updated.lastTransactionDate = new Date();
  await updated.save();
  return updated;
}

async function updateLotQuantity(lotId, delta, itemId, warehouseId, subinventory, lotNumber) {
  if (!lotNumber) return null;
  let lot = lotId ? await Lot.findById(lotId) : await Lot.findOne({ item: itemId, warehouse: warehouseId, subinventory, lotNumber });
  if (!lot) {
    lot = await Lot.create({
      lotNumber,
      item: itemId,
      warehouse: warehouseId,
      subinventory,
      quantity: 0,
      createdBy: null
    });
  }
  lot.quantity = Math.max(0, (lot.quantity || 0) + Number(delta));
  await lot.save();
  return lot;
}

async function updateSerialStatus(serialId, status) {
  if (!serialId) return null;
  const serial = await Serial.findById(serialId);
  if (!serial) return null;
  serial.status = status;
  await serial.save();
  return serial;
}

/**
 * Recalculate and sync StockLevel balance from StockTransaction ledger
 */
async function syncStockLevel(itemId, warehouseId, subinventory = 'MAIN', locator = '') {
  const transactions = await StockTransaction.find({
    item: itemId,
    warehouse: warehouseId,
    subinventory,
    status: 'Posted'
  });

  let onHand = 0;
  let reserved = 0;
  let allocated = 0;

  for (const tx of transactions) {
    if (['GOODS_RECEIPT', 'TRANSFER', 'ADJUSTMENT', 'RETURN_RECEIPT'].includes(tx.type)) {
      onHand += tx.quantity;
    } else if (['GOODS_ISSUE'].includes(tx.type)) {
      onHand -= Math.abs(tx.quantity);
    } else if (tx.type === 'RESERVATION') {
      reserved += tx.quantity;
    } else if (tx.type === 'ALLOCATION') {
      allocated += tx.quantity;
    } else if (tx.type === 'RELEASE') {
      reserved = Math.max(0, reserved - tx.quantity);
    }
  }

  const available = Math.max(0, onHand - reserved - allocated);

  let stockLevel = await StockLevel.findOne({
    item: itemId,
    warehouse: warehouseId,
    subinventory
  });

  if (!stockLevel) {
    stockLevel = new StockLevel({
      item: itemId,
      warehouse: warehouseId,
      subinventory,
      locator,
      onHand: Math.max(0, onHand),
      reserved,
      allocated,
      available
    });
  } else {
    stockLevel.onHand = Math.max(0, onHand);
    stockLevel.reserved = reserved;
    stockLevel.allocated = allocated;
    stockLevel.available = available;
    if (locator) stockLevel.locator = locator;
  }

  await stockLevel.save();
  return stockLevel;
}

/**
 * FEFO (First Expired -> First Out) batch selector
 */
async function getFefoRecommendedBatches(itemId, warehouseId, requiredQty) {
  const now = new Date();
  const availableLots = await Lot.find({
    item: itemId,
    warehouse: warehouseId,
    status: 'Unrestricted',
    quantity: { $gt: 0 },
    expiryDate: { $gt: now }
  }).sort({ expiryDate: 1 }); // Sort by earliest expiry first

  let remaining = requiredQty;
  const selected = [];

  for (const lot of availableLots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lot.quantity);
    selected.push({
      lotId: lot._id,
      lotNumber: lot.lotNumber,
      expiryDate: lot.expiryDate,
      availableQty: lot.quantity,
      takeQty: take
    });
    remaining -= take;
  }

  return {
    fulfilled: remaining <= 0,
    shortageQty: Math.max(0, remaining),
    selectedBatches: selected
  };
}

/**
 * Landed Cost Allocation Engine (Import Purchasing)
 */
function calculateLandedCostAllocation(lines, extraCosts, method = 'By Value') {
  // lines: Array of { item, quantity, purchaseUnitPrice }
  // extraCosts: { freight, insurance, customs, handling, inlandTransport, other }
  const totalExtraCost = Object.values(extraCosts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  const totalBaseValue = lines.reduce((acc, line) => acc + (line.quantity * line.purchaseUnitPrice), 0);
  const totalBaseQty = lines.reduce((acc, line) => acc + line.quantity, 0);

  return lines.map(line => {
    const lineValue = line.quantity * line.purchaseUnitPrice;
    let shareRatio = 0;

    if (method === 'By Value' && totalBaseValue > 0) {
      shareRatio = lineValue / totalBaseValue;
    } else if (method === 'By Quantity' && totalBaseQty > 0) {
      shareRatio = line.quantity / totalBaseQty;
    } else {
      shareRatio = lines.length > 0 ? 1 / lines.length : 0;
    }

    const allocatedCost = totalExtraCost * shareRatio;
    const totalLineLandedCost = lineValue + allocatedCost;
    const unitLandedCost = line.quantity > 0 ? totalLineLandedCost / line.quantity : 0;

    return {
      item: line.item,
      quantity: line.quantity,
      purchaseUnitPrice: line.purchaseUnitPrice,
      allocatedCost: Math.round(allocatedCost * 100) / 100,
      unitLandedCost: Math.round(unitLandedCost * 100) / 100,
      totalLineLandedCost: Math.round(totalLineLandedCost * 100) / 100
    };
  });
}

/**
 * ABC Classification Recalculation Engine (80 / 15 / 5 Rule)
 */
async function recalculateAbcClassification() {
  const items = await InventoryItem.find({ status: 'Active' });
  const stockLevels = await StockLevel.find({});

  const itemValues = items.map(item => {
    const itemLevels = stockLevels.filter(sl => sl.item.toString() === item._id.toString());
    const totalQty = itemLevels.reduce((sum, sl) => sum + sl.onHand, 0);
    const totalValue = totalQty * (item.unitCost || item.sellingPrice || 0);
    return { item, totalQty, totalValue };
  });

  // Sort descending by total monetary value
  itemValues.sort((a, b) => b.totalValue - a.totalValue);

  const grandTotalValue = itemValues.reduce((sum, iv) => sum + iv.totalValue, 0);
  let cumulativeValue = 0;

  for (const iv of itemValues) {
    cumulativeValue += iv.totalValue;
    const pct = grandTotalValue > 0 ? (cumulativeValue / grandTotalValue) * 100 : 0;

    let category = 'C';
    if (pct <= 80) category = 'A';
    else if (pct <= 95) category = 'B';
    else category = 'C';

    if (iv.item.abcClassification !== category) {
      iv.item.abcClassification = category;
      await iv.item.save();
    }
  }

  return itemValues;
}

/**
 * Inventory Valuation & Accounting Journal Entry Generator
 */
async function generateInventoryValuationReport(methodOverride = null) {
  const items = await InventoryItem.find({ status: 'Active' });
  const stockLevels = await StockLevel.find({}).populate('warehouse', 'code name');

  let totalCompanyValuation = 0;
  const valuationRows = [];

  for (const item of items) {
    const itemLevels = stockLevels.filter(sl => sl.item.toString() === item._id.toString());
    const onHand = itemLevels.reduce((sum, sl) => sum + sl.onHand, 0);
    const method = methodOverride || item.valuationMethod || 'FIFO';

    const unitCost = item.unitCost || 0;
    const landedCost = item.landedCostUnit || 0;
    const effectiveCost = landedCost > 0 ? landedCost : unitCost;

    const inventoryValue = onHand * effectiveCost;
    totalCompanyValuation += inventoryValue;

    valuationRows.push({
      itemId: item._id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      valuationMethod: method,
      onHandQty: onHand,
      unitCost: effectiveCost,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      warehouses: itemLevels.map(sl => ({
        warehouseCode: sl.warehouse?.code || 'WH',
        onHand: sl.onHand,
        value: sl.onHand * effectiveCost
      }))
    });
  }

  const accountingJournalEntryPreview = {
    journalId: `JV-INV-${Date.now().toString().slice(-6)}`,
    date: new Date(),
    narrative: `Inventory Valuation Financial Summary (${valuationRows.length} active products)`,
    entries: [
      { account: '1400 - Inventory Asset', debit: totalCompanyValuation, credit: 0 },
      { account: '2100 - Goods Received Clearing / AP', debit: 0, credit: totalCompanyValuation }
    ]
  };

  return {
    totalCompanyValuation: Math.round(totalCompanyValuation * 100) / 100,
    itemCount: valuationRows.length,
    valuationRows,
    accountingJournalEntryPreview
  };
}

module.exports = {
  checkRole,
  generateId,
  getOrCreateStockLevel,
  postTransaction,
  updateStockLevel,
  updateLotQuantity,
  updateSerialStatus,
  syncStockLevel,
  getFefoRecommendedBatches,
  calculateLandedCostAllocation,
  recalculateAbcClassification,
  generateInventoryValuationReport
};
