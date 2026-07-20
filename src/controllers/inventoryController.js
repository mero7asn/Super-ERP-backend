const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const Warehouse = require('../models/Warehouse');
const StockLevel = require('../models/StockLevel');
const StockTransaction = require('../models/StockTransaction');
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
const {
  checkRole, generateId, getOrCreateStockLevel,
  postTransaction, updateStockLevel, updateLotQuantity, updateSerialStatus
} = require('../services/inventoryService');
const { buildPutawaySuggestions } = require('../services/inventoryWorkflowService');

exports.getInventoryItems = async (req, res) => {
  try {
    checkRole(req.user);
    const { page = 1, limit = 50, search, category, status, lotControl, serialControl } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { sku: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (lotControl !== undefined) query.lotControl = lotControl === 'true';
    if (serialControl !== undefined) query.serialControl = serialControl === 'true';

    const items = await InventoryItem.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await InventoryItem.countDocuments(query);

    res.json({ success: true, data: items, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    checkRole(req.user);
    const {
      sku, name, description, category, baseUom, alternateUoms,
      unitCost, sellingPrice, weight, dimensions, status,
      lotControl, serialControl, shelfLifeDays, reorderPoint,
      maxStockLevel, minOrderQty, imageUrl, tags
    } = req.body;

    if (!sku || !name) return res.status(400).json({ message: 'SKU and name are required.' });

    const existing = await InventoryItem.findOne({ sku: sku.trim().toUpperCase() });
    if (existing) return res.status(400).json({ message: 'An inventory item with this SKU already exists.' });

    const item = await InventoryItem.create({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      description: description || '',
      category: category || 'General',
      baseUom: baseUom || 'EA',
      alternateUoms: alternateUoms || [],
      unitCost: Number(unitCost) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      weight: Number(weight) || 0,
      dimensions: dimensions || {},
      status: status || 'Active',
      lotControl: !!lotControl,
      serialControl: !!serialControl,
      shelfLifeDays: Number(shelfLifeDays) || 0,
      reorderPoint: Number(reorderPoint) || 0,
      maxStockLevel: Number(maxStockLevel) || 0,
      minOrderQty: Number(minOrderQty) || 1,
      imageUrl: imageUrl || '',
      tags: tags || [],
      createdBy: req.user._id
    });

    const populated = await item.populate('createdBy', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create inventory item', error: error.message });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    checkRole(req.user);
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });

    const allowed = [
      'name', 'description', 'category', 'baseUom', 'alternateUoms',
      'unitCost', 'sellingPrice', 'weight', 'dimensions', 'status',
      'lotControl', 'serialControl', 'shelfLifeDays', 'reorderPoint',
      'maxStockLevel', 'minOrderQty', 'imageUrl', 'tags'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'lotControl' || field === 'serialControl') {
          item[field] = !!req.body[field];
        } else {
          item[field] = req.body[field];
        }
      }
    });

    const updated = await item.save();
    const populated = await updated.populate('createdBy', 'firstName lastName');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update inventory item', error: error.message });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    checkRole(req.user);
    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    if (!isAdmin) return res.status(403).json({ message: 'Only administrators can delete inventory items.' });

    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });

    await item.deleteOne();
    res.json({ success: true, message: 'Inventory item deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete inventory item', error: error.message });
  }
};

exports.getStockLevels = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, warehouse, subinventory } = req.query;
    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (subinventory) query.subinventory = subinventory.toUpperCase();

    const stocks = await StockLevel.find(query)
      .populate('item', 'sku name unitCost baseUom')
      .populate('warehouse', 'code name')
      .sort({ 'item.sku': 1, subinventory: 1, locator: 1 });

    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getStockTransactions = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, warehouse, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await StockTransaction.find(query)
      .populate('item', 'sku name')
      .populate('warehouse', 'code name')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await StockTransaction.countDocuments(query);

    res.json({ success: true, data: transactions, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.postGoodsReceipt = async (req, res) => {
  try {
    checkRole(req.user);
    const receiving = await ReceivingOrder.findById(req.params.id).populate('warehouse');
    if (!receiving) return res.status(404).json({ message: 'Receiving order not found.' });
    if (receiving.status !== 'Received') return res.status(400).json({ message: 'Receiving order must be in Received status.' });

    const grTxnIds = [];

    for (const line of receiving.lines) {
      if (line.qualityStatus !== 'Passed' || line.acceptedQty <= 0) continue;

      const stock = await getOrCreateStockLevel(
        line.item, receiving.warehouse._id, receiving.subinventory,
        line.actualLocator || line.suggestedLocator || '', line.lotNumber, ''
      );

      const txn = await postTransaction({
        transactionId: generateId('GR'),
        type: 'GOODS_RECEIPT',
        subtype: 'PO_RECEIPT',
        item: line.item,
        warehouse: receiving.warehouse._id,
        subinventory: receiving.subinventory,
        locator: line.actualLocator || line.suggestedLocator || '',
        lotNumber: line.lotNumber,
        quantity: line.acceptedQty,
        unitOfMeasure: line.uom,
        unitCost: line.unitCost || 0,
        totalValue: line.acceptedQty * (line.unitCost || 0),
        referenceType: 'PO',
        referenceId: receiving._id,
        referenceNumber: receiving.poNumber,
        performedBy: req.user._id,
        status: 'Posted'
      });

      await updateStockLevel(stock, line.acceptedQty, 'GOODS_RECEIPT');
      if (line.lotNumber) await updateLotQuantity(null, line.acceptedQty, line.item, receiving.warehouse._id, receiving.subinventory, line.lotNumber);
      grTxnIds.push(txn._id);
    }

    receiving.status = 'Completed';
    receiving.completedAt = new Date();
    receiving.goodsReceiptTransactionId = grTxnIds[0];
    await receiving.save();

    res.json({ success: true, message: 'Goods receipt posted successfully.', transactionIds: grTxnIds });
  } catch (error) {
    res.status(500).json({ message: 'Failed to post goods receipt', error: error.message });
  }
};

exports.postGoodsIssue = async (req, res) => {
  try {
    checkRole(req.user);
    const shipment = await Shipment.findById(req.params.id).populate('warehouse');
    if (!shipment) return res.status(404).json({ message: 'Shipment not found.' });
    if (shipment.status !== 'Shipped') return res.status(400).json({ message: 'Shipment must be in Shipped status.' });

    const giTxnIds = [];

    for (const line of shipment.lines) {
      const stock = await getOrCreateStockLevel(
        line.item, shipment.warehouse._id, 'SHIPPING', '', line.lotNumber, ''
      );

      const txn = await postTransaction({
        transactionId: generateId('GI'),
        type: 'GOODS_ISSUE',
        subtype: 'SALES_SHIPMENT',
        item: line.item,
        warehouse: shipment.warehouse._id,
        subinventory: 'SHIPPING',
        locator: '',
        lotNumber: line.lotNumber,
        quantity: -line.quantity,
        unitOfMeasure: line.uom,
        unitCost: 0,
        totalValue: 0,
        referenceType: 'SO',
        referenceId: shipment._id,
        referenceNumber: shipment.orderReference,
        performedBy: req.user._id,
        status: 'Posted'
      });

      await updateStockLevel(stock, -line.quantity, 'GOODS_ISSUE');
      giTxnIds.push(txn._id);
    }

    shipment.goodsIssueTransactionId = giTxnIds[0];
    await shipment.save();

    res.json({ success: true, message: 'Goods issue posted successfully.', transactionIds: giTxnIds });
  } catch (error) {
    res.status(500).json({ message: 'Failed to post goods issue', error: error.message });
  }
};

exports.createStockTransfer = async (req, res) => {
  try {
    checkRole(req.user);
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Stock transfer not found.' });
    if (transfer.status !== 'Draft') return res.status(400).json({ message: 'Transfer must be in Draft status.' });

    const fromStock = await getOrCreateStockLevel(
      transfer.item, transfer.fromWarehouse, transfer.fromSubinventory,
      transfer.fromLocator, transfer.fromLotNumber, transfer.fromSerialNumber
    );

    if (fromStock.onHand < transfer.quantity) {
      return res.status(400).json({ message: 'Insufficient stock at source location.' });
    }

    const outTxn = await postTransaction({
      transactionId: generateId('TRF'),
      type: 'TRANSFER',
      subtype: 'BIN_TRANSFER',
      item: transfer.item,
      warehouse: transfer.fromWarehouse,
      subinventory: transfer.fromSubinventory,
      locator: transfer.fromLocator,
      lotNumber: transfer.fromLotNumber,
      serialNumber: transfer.fromSerialNumber,
      quantity: -transfer.quantity,
      unitOfMeasure: transfer.unitOfMeasure,
      referenceType: 'TRANSFER',
      referenceId: transfer._id,
      referenceNumber: transfer.transferId,
      performedBy: req.user._id,
      status: 'Posted'
    });

    await updateStockLevel(fromStock, -transfer.quantity, 'TRANSFER');

    const toStock = await getOrCreateStockLevel(
      transfer.item, transfer.toWarehouse, transfer.toSubinventory,
      transfer.toLocator, transfer.toLotNumber, transfer.toSerialNumber
    );

    const inTxn = await postTransaction({
      transactionId: generateId('TRF'),
      type: 'TRANSFER',
      subtype: 'BIN_TRANSFER',
      item: transfer.item,
      warehouse: transfer.toWarehouse,
      subinventory: transfer.toSubinventory,
      locator: transfer.toLocator,
      lotNumber: transfer.toLotNumber,
      serialNumber: transfer.toSerialNumber,
      quantity: transfer.quantity,
      unitOfMeasure: transfer.unitOfMeasure,
      referenceType: 'TRANSFER',
      referenceId: transfer._id,
      referenceNumber: transfer.transferId,
      performedBy: req.user._id,
      status: 'Posted'
    });

    await updateStockLevel(toStock, transfer.quantity, 'TRANSFER');

    transfer.status = 'Completed';
    transfer.outboundTransactionId = outTxn._id;
    transfer.inboundTransactionId = inTxn._id;
    transfer.processedBy = req.user._id;
    await transfer.save();

    res.json({ success: true, message: 'Stock transfer completed.', outboundTransactionId: outTxn._id, inboundTransactionId: inTxn._id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to execute stock transfer', error: error.message });
  }
};

exports.postInventoryAdjustment = async (req, res) => {
  try {
    checkRole(req.user);
    const adjustment = await InventoryAdjustment.findById(req.params.id);
    if (!adjustment) return res.status(404).json({ message: 'Inventory adjustment not found.' });
    if (adjustment.status !== 'Approved') return res.status(400).json({ message: 'Adjustment must be Approved before posting.' });

    const stock = await getOrCreateStockLevel(
      adjustment.item, adjustment.warehouse, adjustment.subinventory,
      adjustment.locator, adjustment.lotNumber, adjustment.serialNumber
    );

    const txn = await postTransaction({
      transactionId: generateId('ADJ'),
      type: 'ADJUSTMENT',
      subtype: adjustment.varianceQuantity > 0 ? 'MISC_RECEIPT' : 'MISC_ISSUE',
      item: adjustment.item,
      warehouse: adjustment.warehouse,
      subinventory: adjustment.subinventory,
      locator: adjustment.locator,
      lotNumber: adjustment.lotNumber,
      serialNumber: adjustment.serialNumber,
      quantity: adjustment.varianceQuantity,
      unitOfMeasure: 'EA',
      unitCost: adjustment.unitCost,
      totalValue: adjustment.varianceValue,
      referenceType: 'ADJUSTMENT',
      referenceId: adjustment._id,
      referenceNumber: adjustment.adjustmentId,
      reasonCode: adjustment.reasonCode,
      remarks: adjustment.remarks,
      performedBy: req.user._id,
      status: 'Posted'
    });

    await updateStockLevel(stock, adjustment.varianceQuantity, 'ADJUSTMENT');
    if (adjustment.lotNumber) await updateLotQuantity(null, adjustment.varianceQuantity, adjustment.item, adjustment.warehouse, adjustment.subinventory, adjustment.lotNumber);

    adjustment.status = 'Posted';
    adjustment.stockTransactionId = txn._id;
    await adjustment.save();

    res.json({ success: true, message: 'Inventory adjustment posted.', transactionId: txn._id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to post adjustment', error: error.message });
  }
};

exports.createReceivingOrder = async (req, res) => {
  try {
    checkRole(req.user);
    const { lines = [], ...rest } = req.body;
    const normalizedLines = (lines || []).map((line) => ({
      ...line,
      expectedQty: Number(line.expectedQty || 0),
      receivedQty: Number(line.receivedQty || 0),
      acceptedQty: Number(line.acceptedQty || 0),
      rejectedQty: Number(line.rejectedQty || 0),
      unitCost: Number(line.unitCost || 0),
      qualityStatus: line.qualityStatus || 'Pending',
      damageNotes: line.damageNotes || '',
      suggestedLocator: (line.suggestedLocator || '').toUpperCase(),
      actualLocator: (line.actualLocator || '').toUpperCase(),
      overrideReason: line.overrideReason || ''
    }));

    const receiving = await ReceivingOrder.create({
      ...rest,
      lines: normalizedLines,
      receivingId: generateId('RCP'),
      status: 'Expected',
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: receiving });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create receiving order', error: error.message });
  }
};

exports.updateReceivingOrder = async (req, res) => {
  try {
    checkRole(req.user);
    const receiving = await ReceivingOrder.findById(req.params.id);
    if (!receiving) return res.status(404).json({ message: 'Receiving order not found.' });

    const allowed = ['supplierName', 'supplierRef', 'asnNumber', 'lines', 'remarks', 'status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) receiving[field] = req.body[field];
    });

    const updated = await receiving.save();
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update receiving order', error: error.message });
  }
};

exports.createShipment = async (req, res) => {
  try {
    checkRole(req.user);
    const shipment = await Shipment.create({
      ...req.body,
      shipmentId: generateId('SHP'),
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: shipment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create shipment', error: error.message });
  }
};

exports.createReturnOrder = async (req, res) => {
  try {
    checkRole(req.user);
    const returnOrder = await ReturnOrder.create({
      ...req.body,
      returnId: generateId('RTR'),
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: returnOrder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create return order', error: error.message });
  }
};

exports.createCycleCount = async (req, res) => {
  try {
    checkRole(req.user);
    const cycleCount = await CycleCount.create({
      ...req.body,
      countId: generateId('CC'),
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: cycleCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create cycle count', error: error.message });
  }
};

exports.createPhysicalInventory = async (req, res) => {
  try {
    checkRole(req.user);
    const pi = await PhysicalInventory.create({
      ...req.body,
      piId: generateId('PI'),
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: pi });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create physical inventory', error: error.message });
  }
};

exports.getInventoryKPIs = async (req, res) => {
  try {
    checkRole(req.user);

    const [totalItems, totalWarehouses, stockAgg, txnCount, recentTxns, adjustmentAgg] = await Promise.all([
      InventoryItem.countDocuments({ status: 'Active' }),
      Warehouse.countDocuments({ status: 'Active' }),
      StockLevel.aggregate([
        {
          $lookup: { from: 'inventoryitems', localField: 'item', foreignField: '_id', as: 'itemData' }
        },
        { $unwind: { path: '$itemData', preserveNullAndEmpty: false } },
        {
          $group: {
            _id: null,
            totalOnHand: { $sum: '$onHand' },
            totalAvailable: { $sum: '$available' },
            totalAllocated: { $sum: '$allocated' },
            totalBlocked: { $sum: '$blocked' },
            totalInventoryValue: { $sum: { $multiply: ['$onHand', '$itemData.unitCost'] } }
          }
        }
      ]),
      StockTransaction.countDocuments({}),
      StockTransaction.find().sort({ createdAt: -1 }).limit(10).populate('item', 'sku name').populate('warehouse', 'code name'),
      InventoryAdjustment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const stock = stockAgg[0] || {};

    // ── Inventory Turnover & Days on Hand (rolling 90 days) ──
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const cogsPipeline = await StockTransaction.aggregate([
      { $match: { type: 'GOODS_ISSUE', status: 'Posted', createdAt: { $gte: since90 } } },
      { $group: { _id: null, totalCOGS: { $sum: '$totalValue' } } }
    ]);
    const totalCOGS90 = cogsPipeline[0]?.totalCOGS || 0;
    const annualizedCOGS = (totalCOGS90 / 90) * 365;
    const avgInventoryValue = stock.totalInventoryValue || 0;
    const inventoryTurnover = avgInventoryValue > 0 ? Math.round((annualizedCOGS / avgInventoryValue) * 100) / 100 : 0;
    const daysOnHand = annualizedCOGS > 0 ? Math.round((avgInventoryValue / annualizedCOGS) * 365 * 10) / 10 : null;

    // ── Stock Accuracy from cycle counts (last 30 days) ──
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const accuracyPipeline = await CycleCount.aggregate([
      { $match: { status: 'Posted', createdAt: { $gte: since30 } } },
      { $unwind: '$lines' },
      {
        $group: {
          _id: null,
          totalCounted: { $sum: '$lines.systemQty' },
          totalVariance: { $sum: { $abs: '$lines.variance' } }
        }
      }
    ]);
    const acc = accuracyPipeline[0];
    const stockAccuracy = acc && acc.totalCounted > 0
      ? Math.round(((acc.totalCounted - acc.totalVariance) / acc.totalCounted) * 10000) / 100
      : null;

    // ── Fill Rate (last 30 days) ──
    const fillRatePipeline = await Shipment.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'Shipped'] }, 1, 0] } }
        }
      }
    ]);
    const fr = fillRatePipeline[0];
    const fillRate = fr && fr.total > 0 ? Math.round((fr.shipped / fr.total) * 10000) / 100 : null;

    // ── Reorder Alerts count ──
    const reorderAlertsCount = await StockLevel.aggregate([
      { $group: { _id: '$item', totalAvailable: { $sum: '$available' } } },
      { $lookup: { from: 'inventoryitems', localField: '_id', foreignField: '_id', as: 'itemData' } },
      { $unwind: { path: '$itemData', preserveNullAndEmpty: false } },
      { $match: { 'itemData.reorderPoint': { $gt: 0 }, $expr: { $lte: ['$totalAvailable', '$itemData.reorderPoint'] } } },
      { $count: 'count' }
    ]);

    // ── Expiry Alerts (next 30 days) ──
    const expiryAlertCount = await Lot.countDocuments({
      expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      status: 'Unrestricted',
      quantity: { $gt: 0 }
    });

    // ── Open pick tasks ──
    const openPickTasks = await PickTask.countDocuments({ status: { $in: ['Draft', 'Assigned', 'In Progress'] } });

    res.json({
      success: true,
      data: {
        totalItems,
        totalWarehouses,
        totalOnHand: stock.totalOnHand || 0,
        totalAvailable: stock.totalAvailable || 0,
        totalAllocated: stock.totalAllocated || 0,
        totalBlocked: stock.totalBlocked || 0,
        totalInventoryValue: Math.round((stock.totalInventoryValue || 0) * 100) / 100,
        totalTransactions: txnCount,
        recentTransactions: recentTxns,
        adjustmentsByStatus: adjustmentAgg,
        // Enterprise KPIs
        inventoryTurnover,
        daysOnHand,
        stockAccuracy,
        fillRate,
        reorderAlertsCount: reorderAlertsCount[0]?.count || 0,
        expiryAlertCount,
        openPickTasks
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    checkRole(req.user);
    const warehouses = await Warehouse.find().sort({ code: 1 });
    res.json({ success: true, data: warehouses });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    checkRole(req.user);
    const warehouse = await Warehouse.create({ ...req.body, code: req.body.code.toUpperCase(), createdBy: req.user._id });
    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create warehouse', error: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    checkRole(req.user);
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found.' });

    const allowed = ['name', 'description', 'type', 'address', 'contact', 'status', 'subinventories'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) warehouse[field] = req.body[field];
    });

    if (req.body.code) warehouse.code = req.body.code.toUpperCase();

    const updated = await warehouse.save();
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update warehouse', error: error.message });
  }
};

exports.getLots = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, warehouse, status } = req.query;
    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    const lots = await Lot.find(query).populate('item', 'sku name').populate('warehouse', 'code name').sort({ expiryDate: 1 });
    res.json({ success: true, data: lots });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getSerials = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, warehouse, status } = req.query;
    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    const serials = await Serial.find(query).populate('item', 'sku name').populate('warehouse', 'code name').sort({ serialNumber: 1 });
    res.json({ success: true, data: serials });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.approveAdjustment = async (req, res) => {
  try {
    checkRole(req.user);
    const isAdmin = ['Super CRM Administrator', 'System Architect', 'Inventory Manager', 'Warehouse Manager'].includes(req.user.role);
    if (!isAdmin) return res.status(403).json({ message: 'Only managers can approve adjustments.' });

    const adjustment = await InventoryAdjustment.findById(req.params.id);
    if (!adjustment) return res.status(404).json({ message: 'Adjustment not found.' });
    if (adjustment.status !== 'Pending') return res.status(400).json({ message: 'Adjustment is not pending approval.' });

    adjustment.status = 'Approved';
    adjustment.approvedBy = req.user._id;
    adjustment.approvedAt = new Date();
    await adjustment.save();

    res.json({ success: true, message: 'Adjustment approved.', data: adjustment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve adjustment', error: error.message });
  }
};

exports.rejectAdjustment = async (req, res) => {
  try {
    checkRole(req.user);
    const isAdmin = ['Super CRM Administrator', 'System Architect', 'Inventory Manager', 'Warehouse Manager'].includes(req.user.role);
    if (!isAdmin) return res.status(403).json({ message: 'Only managers can reject adjustments.' });

    const adjustment = await InventoryAdjustment.findById(req.params.id);
    if (!adjustment) return res.status(404).json({ message: 'Adjustment not found.' });
    if (adjustment.status !== 'Pending') return res.status(400).json({ message: 'Adjustment is not pending approval.' });

    adjustment.status = 'Rejected';
    adjustment.approvedBy = req.user._id;
    adjustment.approvedAt = new Date();
    await adjustment.save();

    res.json({ success: true, message: 'Adjustment rejected.', data: adjustment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject adjustment', error: error.message });
  }
};

exports.getReceivingOrders = async (req, res) => {
  try {
    checkRole(req.user);
    const { warehouse, status } = req.query;
    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    const orders = await ReceivingOrder.find(query)
      .populate('warehouse', 'code name')
      .populate('receivedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getShipments = async (req, res) => {
  try {
    checkRole(req.user);
    const { warehouse, status } = req.query;
    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    const shipments = await Shipment.find(query)
      .populate('warehouse', 'code name')
      .populate('shippedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: shipments });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createTransfer = async (req, res) => {
  try {
    checkRole(req.user);
    const {
      item, quantity, unitOfMeasure,
      fromWarehouse, fromSubinventory, fromLocator, fromLotNumber, fromSerialNumber,
      toWarehouse, toSubinventory, toLocator, toLotNumber, toSerialNumber,
      transferType, shipmentRef, carrier, trackingNumber, expectedArrival, remarks
    } = req.body;

    if (!item || !quantity || !fromWarehouse || !toWarehouse || !fromSubinventory || !toSubinventory) {
      return res.status(400).json({ message: 'Item, quantity, warehouses, and subinventories are required.' });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero.' });
    }

    const transfer = await StockTransfer.create({
      transferId: generateId('TRF'),
      item,
      quantity: Number(quantity),
      unitOfMeasure: unitOfMeasure || 'EA',
      fromWarehouse, fromSubinventory, fromLocator: fromLocator || '', fromLotNumber: fromLotNumber || '', fromSerialNumber: fromSerialNumber || '',
      toWarehouse, toSubinventory, toLocator: toLocator || '', toLotNumber: toLotNumber || '', toSerialNumber: toSerialNumber || '',
      transferType: transferType || 'BIN_TRANSFER',
      status: 'Draft',
      shipmentRef: shipmentRef || '',
      carrier: carrier || '',
      trackingNumber: trackingNumber || '',
      expectedArrival: expectedArrival || null,
      remarks: remarks || '',
      requestedBy: req.user._id
    });

    const populated = await transfer.populate('fromWarehouse', 'code name').populate('toWarehouse', 'code name').populate('item', 'sku name');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create transfer', error: error.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, fromWarehouse, toWarehouse, status } = req.query;
    const query = {};
    if (item) query.item = item;
    if (fromWarehouse) query.fromWarehouse = fromWarehouse;
    if (toWarehouse) query.toWarehouse = toWarehouse;
    if (status) query.status = status;

    const transfers = await StockTransfer.find(query)
      .populate('item', 'sku name')
      .populate('fromWarehouse', 'code name')
      .populate('toWarehouse', 'code name')
      .populate('requestedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createAdjustment = async (req, res) => {
  try {
    checkRole(req.user);
    const {
      item, warehouse, subinventory, locator, lotNumber, serialNumber,
      systemQuantity, countedQuantity, unitCost, reasonCode, reasonDescription,
      glAccount, costCenter, remarks
    } = req.body;

    if (!item || !warehouse || !subinventory || systemQuantity === '' || countedQuantity === '' || !reasonCode) {
      return res.status(400).json({ message: 'Item, warehouse, subinventory, quantities, and reason code are required.' });
    }

    const variance = Number(countedQuantity) - Number(systemQuantity);
    const varianceValue = variance * (Number(unitCost) || 0);

    const adjustment = await InventoryAdjustment.create({
      adjustmentId: generateId('ADJ'),
      item, warehouse, subinventory: subinventory.toUpperCase(), locator: (locator || '').toUpperCase(),
      lotNumber: (lotNumber || '').toUpperCase(), serialNumber: (serialNumber || '').toUpperCase(),
      systemQuantity: Number(systemQuantity), countedQuantity: Number(countedQuantity),
      varianceQuantity: variance, unitCost: Number(unitCost) || 0, varianceValue,
      reasonCode, reasonDescription: reasonDescription || '', glAccount: glAccount || '', costCenter: costCenter || '',
      status: 'Pending', requestedBy: req.user._id, remarks: remarks || ''
    });

    const populated = await adjustment.populate('item', 'sku name').populate('warehouse', 'code name').populate('requestedBy', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create adjustment', error: error.message });
  }
};

exports.getAdjustments = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, warehouse, status } = req.query;
    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    const adjustments = await InventoryAdjustment.find(query)
      .populate('item', 'sku name')
      .populate('warehouse', 'code name')
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: adjustments });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getCycleCounts = async (req, res) => {
  try {
    checkRole(req.user);
    const { warehouse, subinventory, status } = req.query;
    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (subinventory) query.subinventory = subinventory.toUpperCase();
    if (status) query.status = status;

    const counts = await CycleCount.find(query)
      .populate('warehouse', 'code name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getPhysicalInventories = async (req, res) => {
  try {
    checkRole(req.user);
    const { warehouse, subinventory, status } = req.query;
    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (subinventory) query.subinventory = subinventory.toUpperCase();
    if (status) query.status = status;

    const inventories = await PhysicalInventory.find(query)
      .populate('warehouse', 'code name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: inventories });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ─── Pick Task Management ────────────────────────────────────────────────────

exports.createPickTask = async (req, res) => {
  try {
    checkRole(req.user);
    const { shipmentId, warehouse, subinventory, pickingStrategy, waveNumber, zone, lines, assignedTo, remarks } = req.body;

    if (!shipmentId || !warehouse || !subinventory || !lines?.length) {
      return res.status(400).json({ message: 'Shipment, warehouse, subinventory, and lines are required.' });
    }

    const pickTask = await PickTask.create({
      pickTaskId: generateId('PICK'),
      shipmentId,
      warehouse,
      subinventory: subinventory.toUpperCase(),
      status: 'Draft',
      pickingStrategy: pickingStrategy || 'DISCRETE',
      waveNumber: waveNumber || '',
      zone: zone || '',
      lines: lines.map(l => ({
        item: l.item,
        orderedQty: Number(l.orderedQty),
        pickedQty: 0,
        uom: l.uom || 'EA',
        lotNumber: l.lotNumber || '',
        serialNumbers: l.serialNumbers || [],
        sourceLocator: l.sourceLocator || '',
        packCarton: l.packCarton || ''
      })),
      assignedTo: assignedTo || null,
      remarks: remarks || '',
      createdBy: req.user._id
    });

    const populated = await pickTask
      .populate('warehouse', 'code name')
      .then(d => d.populate('lines.item', 'sku name'))
      .then(d => d.populate('assignedTo', 'firstName lastName'))
      .then(d => d.populate('createdBy', 'firstName lastName'));

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create pick task', error: error.message });
  }
};

exports.getPickTasks = async (req, res) => {
  try {
    checkRole(req.user);
    const { warehouse, status, assignedTo, pickingStrategy, page = 1, limit = 50 } = req.query;
    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (pickingStrategy) query.pickingStrategy = pickingStrategy;

    const tasks = await PickTask.find(query)
      .populate('warehouse', 'code name')
      .populate('shipmentId', 'shipmentId customerName')
      .populate('lines.item', 'sku name baseUom')
      .populate('assignedTo', 'firstName lastName')
      .populate('pickedBy', 'firstName lastName')
      .populate('packedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PickTask.countDocuments(query);
    res.json({ success: true, data: tasks, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getPickTask = async (req, res) => {
  try {
    checkRole(req.user);
    const task = await PickTask.findById(req.params.id)
      .populate('warehouse', 'code name')
      .populate('shipmentId', 'shipmentId customerName')
      .populate('lines.item', 'sku name baseUom')
      .populate('assignedTo', 'firstName lastName')
      .populate('pickedBy', 'firstName lastName')
      .populate('packedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!task) return res.status(404).json({ message: 'Pick task not found.' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updatePickTask = async (req, res) => {
  try {
    checkRole(req.user);
    const task = await PickTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Pick task not found.' });

    const { status, assignedTo, lines, waveNumber, zone, remarks } = req.body;

    if (status) {
      const validTransitions = {
        'Draft': ['Assigned', 'Cancelled'],
        'Assigned': ['In Progress', 'Cancelled'],
        'In Progress': ['Picked', 'Cancelled'],
        'Picked': ['Packed'],
        'Packed': []
      };
      if (!validTransitions[task.status]?.includes(status)) {
        return res.status(400).json({ message: `Cannot transition from ${task.status} to ${status}.` });
      }
      task.status = status;
      if (status === 'In Progress' && !task.startedAt) task.startedAt = new Date();
      if (status === 'Picked') task.pickedBy = req.user._id;
      if (status === 'Packed') { task.packedBy = req.user._id; task.completedAt = new Date(); }
    }

    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (waveNumber !== undefined) task.waveNumber = waveNumber.toUpperCase();
    if (zone !== undefined) task.zone = zone.toUpperCase();
    if (remarks !== undefined) task.remarks = remarks;

    if (lines) {
      task.lines = lines.map(l => ({
        ...l,
        pickedQty: Number(l.pickedQty) || 0,
        sourceLocator: (l.sourceLocator || '').toUpperCase(),
        lotNumber: (l.lotNumber || '').toUpperCase()
      }));
    }

    await task.save();
    const populated = await PickTask.findById(task._id)
      .populate('warehouse', 'code name')
      .populate('shipmentId', 'shipmentId customerName')
      .populate('lines.item', 'sku name baseUom')
      .populate('assignedTo', 'firstName lastName')
      .populate('pickedBy', 'firstName lastName')
      .populate('packedBy', 'firstName lastName');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update pick task', error: error.message });
  }
};

exports.releasePickWave = async (req, res) => {
  try {
    checkRole(req.user);
    const { waveNumber, warehouse, subinventory, shipmentIds, pickingStrategy } = req.body;
    if (!waveNumber || !warehouse || !shipmentIds?.length) {
      return res.status(400).json({ message: 'waveNumber, warehouse, and shipmentIds are required.' });
    }

    const Shipment = require('../models/Shipment');
    const shipments = await Shipment.find({ _id: { $in: shipmentIds }, status: 'Draft' })
      .populate('lines.item', 'sku name');

    if (!shipments.length) return res.status(400).json({ message: 'No eligible shipments found.' });

    const tasks = [];
    for (const shipment of shipments) {
      const task = await PickTask.create({
        pickTaskId: generateId('PICK'),
        shipmentId: shipment._id,
        warehouse,
        subinventory: (subinventory || 'MAIN').toUpperCase(),
        status: 'Assigned',
        pickingStrategy: pickingStrategy || 'WAVE',
        waveNumber: waveNumber.toUpperCase(),
        lines: shipment.lines.map(l => ({
          item: l.item._id || l.item,
          orderedQty: l.quantity,
          pickedQty: 0,
          uom: 'EA',
          lotNumber: l.lotNumber || '',
          serialNumbers: l.serialNumbers || [],
          sourceLocator: ''
        })),
        createdBy: req.user._id
      });
      tasks.push(task);
    }
    res.status(201).json({ success: true, data: tasks, message: `Released wave ${waveNumber} with ${tasks.length} pick task(s).` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to release wave', error: error.message });
  }
};

// ─── Inventory Intelligence ──────────────────────────────────────────────────

exports.getInventoryValuation = async (req, res) => {
  try {
    checkRole(req.user);
    const { groupBy = 'item', warehouse } = req.query;

    const matchStage = { onHand: { $gt: 0 } };
    if (warehouse) matchStage.warehouse = new mongoose.Types.ObjectId(warehouse);

    const itemLookup = { from: 'inventoryitems', localField: 'item', foreignField: '_id', as: 'itemData' };
    const warehouseLookup = { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'warehouseData' };

    let pipeline = [];
    pipeline.push({ $match: matchStage });
    pipeline.push({ $lookup: itemLookup });
    pipeline.push({ $lookup: warehouseLookup });
    pipeline.push({ $unwind: { path: '$itemData', preserveNullAndEmpty: false } });
    pipeline.push({ $unwind: { path: '$warehouseData', preserveNullAndEmpty: false } });

    pipeline.push({
      $project: {
        item: '$itemData._id',
        sku: '$itemData.sku',
        itemName: '$itemData.name',
        category: '$itemData.category',
        warehouse: '$warehouseData._id',
        warehouseCode: '$warehouseData.code',
        warehouseName: '$warehouseData.name',
        subinventory: 1,
        onHand: 1,
        available: 1,
        allocated: 1,
        blocked: 1,
        unitCost: '$itemData.unitCost',
        totalValue: { $multiply: ['$onHand', '$itemData.unitCost'] }
      }
    });

    let groupField;
    if (groupBy === 'category') groupField = '$category';
    else if (groupBy === 'warehouse') groupField = '$warehouseCode';
    else groupField = '$sku';

    pipeline.push({
      $group: {
        _id: groupField,
        label: { $first: groupBy === 'item' ? '$itemName' : (groupBy === 'category' ? '$category' : '$warehouseName') },
        totalOnHand: { $sum: '$onHand' },
        totalAvailable: { $sum: '$available' },
        totalAllocated: { $sum: '$allocated' },
        totalBlocked: { $sum: '$blocked' },
        totalValue: { $sum: '$totalValue' },
        itemCount: { $addToSet: '$item' }
      }
    });

    pipeline.push({
      $project: {
        _id: 1,
        label: 1,
        totalOnHand: 1,
        totalAvailable: 1,
        totalAllocated: 1,
        totalBlocked: 1,
        totalValue: { $round: ['$totalValue', 2] },
        itemCount: { $size: '$itemCount' }
      }
    });

    pipeline.push({ $sort: { totalValue: -1 } });

    const results = await StockLevel.aggregate(pipeline);

    const grandTotal = results.reduce((acc, r) => acc + r.totalValue, 0);

    res.json({ success: true, data: results, grandTotal: Math.round(grandTotal * 100) / 100, groupBy });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getABCClassification = async (req, res) => {
  try {
    checkRole(req.user);
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Aggregate GOODS_ISSUE transactions by item over the period
    const issuePipeline = [
      { $match: { type: 'GOODS_ISSUE', status: 'Posted', createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$item',
          totalIssued: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: { from: 'inventoryitems', localField: '_id', foreignField: '_id', as: 'itemData' }
      },
      { $unwind: { path: '$itemData', preserveNullAndEmpty: false } },
      {
        $project: {
          sku: '$itemData.sku',
          name: '$itemData.name',
          category: '$itemData.category',
          totalIssued: 1,
          totalValue: { $round: ['$totalValue', 2] },
          transactionCount: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ];

    const items = await StockTransaction.aggregate(issuePipeline);

    const grandTotal = items.reduce((acc, i) => acc + (i.totalValue || 0), 0);
    let cumulative = 0;
    const classified = items.map(item => {
      cumulative += item.totalValue || 0;
      const pct = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
      const abcClass = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
      return { ...item, cumulativePct: Math.round(pct * 10) / 10, abcClass };
    });

    res.json({ success: true, data: classified, period: `${days} days`, grandTotal: Math.round(grandTotal * 100) / 100 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getDeadStockReport = async (req, res) => {
  try {
    checkRole(req.user);
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Items with onHand > 0 but no GOODS_ISSUE transactions since cutoff
    const activeItemIds = await StockTransaction.distinct('item', {
      type: 'GOODS_ISSUE',
      status: 'Posted',
      createdAt: { $gte: since }
    });

    const deadStock = await StockLevel.aggregate([
      { $match: { onHand: { $gt: 0 }, item: { $nin: activeItemIds } } },
      { $lookup: { from: 'inventoryitems', localField: 'item', foreignField: '_id', as: 'itemData' } },
      { $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'warehouseData' } },
      { $unwind: { path: '$itemData', preserveNullAndEmpty: false } },
      { $unwind: { path: '$warehouseData', preserveNullAndEmpty: false } },
      {
        $group: {
          _id: '$item',
          sku: { $first: '$itemData.sku' },
          name: { $first: '$itemData.name' },
          category: { $first: '$itemData.category' },
          unitCost: { $first: '$itemData.unitCost' },
          totalOnHand: { $sum: '$onHand' },
          lastTransactionDate: { $max: '$lastTransactionDate' }
        }
      },
      {
        $project: {
          sku: 1, name: 1, category: 1,
          totalOnHand: 1,
          totalValue: { $round: [{ $multiply: ['$totalOnHand', '$unitCost'] }, 2] },
          lastTransactionDate: 1,
          daysSinceLastMovement: {
            $divide: [{ $subtract: [new Date(), '$lastTransactionDate'] }, 1000 * 60 * 60 * 24]
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({ success: true, data: deadStock, period: `${days} days`, count: deadStock.length });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getReorderAlerts = async (req, res) => {
  try {
    checkRole(req.user);

    // Items where total available stock < reorderPoint
    const alerts = await StockLevel.aggregate([
      { $match: { available: { $gt: 0 } } },
      {
        $group: {
          _id: '$item',
          totalAvailable: { $sum: '$available' },
          totalOnHand: { $sum: '$onHand' }
        }
      },
      { $lookup: { from: 'inventoryitems', localField: '_id', foreignField: '_id', as: 'itemData' } },
      { $unwind: { path: '$itemData', preserveNullAndEmpty: false } },
      {
        $match: {
          'itemData.reorderPoint': { $gt: 0 },
          $expr: { $lte: ['$totalAvailable', '$itemData.reorderPoint'] }
        }
      },
      {
        $project: {
          sku: '$itemData.sku',
          name: '$itemData.name',
          category: '$itemData.category',
          reorderPoint: '$itemData.reorderPoint',
          maxStockLevel: '$itemData.maxStockLevel',
          minOrderQty: '$itemData.minOrderQty',
          totalAvailable: 1,
          totalOnHand: 1,
          shortage: { $subtract: ['$itemData.reorderPoint', '$totalAvailable'] }
        }
      },
      { $sort: { shortage: -1 } }
    ]);

    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getExpiryAlerts = async (req, res) => {
  try {
    checkRole(req.user);
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

    const expiringLots = await Lot.find({
      expiryDate: { $lte: cutoff },
      status: 'Unrestricted',
      quantity: { $gt: 0 }
    })
      .populate('item', 'sku name category shelfLifeDays')
      .populate('warehouse', 'code name')
      .sort({ expiryDate: 1 });

    const result = expiringLots.map(l => ({
      _id: l._id,
      lotNumber: l.lotNumber,
      item: l.item,
      warehouse: l.warehouse,
      subinventory: l.subinventory,
      quantity: l.quantity,
      expiryDate: l.expiryDate,
      bestBeforeDate: l.bestBeforeDate,
      daysUntilExpiry: Math.ceil((new Date(l.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
      status: l.status
    }));

    res.json({ success: true, data: result, count: result.length, horizon: `${days} days` });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getPutawaySuggestion = async (req, res) => {
  try {
    checkRole(req.user);
    const { item, warehouse, quantity, lotNumber, strategy } = req.query;
    if (!item || !warehouse) {
      return res.status(400).json({ message: 'item and warehouse are required.' });
    }

    const warehouseDoc = await Warehouse.findById(warehouse);
    if (!warehouseDoc) return res.status(404).json({ message: 'Warehouse not found.' });

    const itemDoc = await InventoryItem.findById(item);
    if (!itemDoc) return res.status(404).json({ message: 'Item not found.' });

    const existingStock = await StockLevel.find({ item, warehouse, onHand: { $gt: 0 } })
      .sort({ onHand: -1 })
      .limit(3);

    let lot = null;
    if (lotNumber) {
      lot = await Lot.findOne({ lotNumber: lotNumber.toUpperCase(), warehouse, item });
    }

    const suggestions = buildPutawaySuggestions({
      itemDoc,
      warehouseDoc,
      existingStock,
      lot,
      quantity: Number(quantity || 0)
    });

    res.json({
      success: true,
      item: { sku: itemDoc.sku, name: itemDoc.name, shelfLifeDays: itemDoc.shelfLifeDays },
      warehouse: { code: warehouseDoc.code, name: warehouseDoc.name },
      suggestions,
      selectedStrategy: strategy || suggestions[0]?.strategy || 'DEFAULT_RECEIVING'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
