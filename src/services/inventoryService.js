const mongoose = require('mongoose');
const crypto = require('crypto');
const StockTransaction = require('../models/StockTransaction');
const StockLevel = require('../models/StockLevel');
const Lot = require('../models/Lot');
const Serial = require('../models/Serial');
const ReceivingOrder = require('../models/ReceivingOrder');
const PickTask = require('../models/PickTask');
const Shipment = require('../models/Shipment');
const ReturnOrder = require('../models/ReturnOrder');
const CycleCount = require('../models/CycleCount');
const PhysicalInventory = require('../models/PhysicalInventory');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const StockTransfer = require('../models/StockTransfer');

const INVENTORY_ROLES = [
  'Super CRM Administrator',
  'System Architect',
  'Inventory Manager',
  'Warehouse Manager',
  'Receiving Clerk',
  'Shipping Clerk',
  'Warehouse Operator',
  'Inventory Clerk',
  'Quality Inspector'
];

function generateId(prefix) {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function checkRole(user) {
  if (!INVENTORY_ROLES.includes(user?.role)) {
    throw new Error('Not authorized for inventory operations');
  }
}

async function getOrCreateStockLevel(itemId, warehouseId, subinventory, locator = '', lotNumber = '', serialNumber = '') {
  const query = {
    item: itemId,
    warehouse: warehouseId,
    subinventory: subinventory.toUpperCase(),
    locator: (locator || '').toUpperCase(),
    lotNumber: (lotNumber || '').toUpperCase(),
    serialNumber: (serialNumber || '').toUpperCase()
  };

  let stock = await StockLevel.findOne(query);
  if (!stock) {
    stock = await StockLevel.create({
      ...query,
      onHand: 0,
      available: 0,
      allocated: 0,
      reserved: 0,
      blocked: 0,
      inTransit: 0
    });
  }
  return stock;
}

async function postTransaction(data) {
  const txn = await StockTransaction.create(data);
  return txn;
}

async function updateStockLevel(stockLevel, quantityDelta, type) {
  stockLevel.onHand = Math.max(0, stockLevel.onHand + quantityDelta);

  if (type === 'GOODS_RECEIPT' || type === 'RETURN_RECEIPT') {
    stockLevel.available = Math.max(0, stockLevel.available + quantityDelta);
  } else if (type === 'GOODS_ISSUE') {
    stockLevel.available = Math.max(0, stockLevel.available - quantityDelta);
    stockLevel.allocated = Math.max(0, stockLevel.allocated - quantityDelta);
  } else if (type === 'TRANSFER') {
  } else if (type === 'ADJUSTMENT') {
    stockLevel.available = Math.max(0, stockLevel.available + quantityDelta);
  } else if (type === 'CYCLE_COUNT' || type === 'PHYSICAL_INVENTORY') {
    stockLevel.available = Math.max(0, Math.min(stockLevel.available, stockLevel.onHand));
  } else if (type === 'RESERVATION') {
    stockLevel.available = Math.max(0, stockLevel.available - quantityDelta);
    stockLevel.reserved = stockLevel.reserved + quantityDelta;
  } else if (type === 'ALLOCATION') {
    stockLevel.available = Math.max(0, stockLevel.available - quantityDelta);
    stockLevel.allocated = stockLevel.allocated + quantityDelta;
  } else if (type === 'RELEASE') {
    stockLevel.available = stockLevel.available + quantityDelta;
    stockLevel.allocated = Math.max(0, stockLevel.allocated - quantityDelta);
  }

  stockLevel.lastTransactionDate = new Date();
  await stockLevel.save();
  return stockLevel;
}

async function updateLotQuantity(lotId, quantityDelta) {
  if (!lotId) return null;
  const lot = await Lot.findById(lotId);
  if (lot) {
    lot.quantity = Math.max(0, lot.quantity + quantityDelta);
    await lot.save();
  }
  return lot;
}

async function updateSerialStatus(serialId, status) {
  if (!serialId) return null;
  const serial = await Serial.findById(serialId);
  if (serial) {
    serial.status = status;
    await serial.save();
  }
  return serial;
}

exports.INVENTORY_ROLES = INVENTORY_ROLES;
exports.generateId = generateId;
exports.checkRole = checkRole;
exports.getOrCreateStockLevel = getOrCreateStockLevel;
exports.postTransaction = postTransaction;
exports.updateStockLevel = updateStockLevel;
exports.updateLotQuantity = updateLotQuantity;
exports.updateSerialStatus = updateSerialStatus;
exports.StockLevel = StockLevel;
exports.StockTransaction = StockTransaction;
exports.Lot = Lot;
exports.Serial = Serial;
exports.ReceivingOrder = ReceivingOrder;
exports.PickTask = PickTask;
exports.Shipment = Shipment;
exports.ReturnOrder = ReturnOrder;
exports.CycleCount = CycleCount;
exports.PhysicalInventory = PhysicalInventory;
exports.InventoryAdjustment = InventoryAdjustment;
exports.StockTransfer = StockTransfer;
