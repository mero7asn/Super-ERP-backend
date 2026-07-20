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
    const receiving = await ReceivingOrder.create({
      ...req.body,
      receivingId: generateId('RCP'),
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

    const totalItems = await InventoryItem.countDocuments({ status: 'Active' });
    const totalWarehouses = await Warehouse.countDocuments({ status: 'Active' });

    const stockAgg = await StockLevel.aggregate([
      { $group: { _id: null, totalOnHand: { $sum: '$onHand' }, totalAvailable: { $sum: '$available' }, totalAllocated: { $sum: '$allocated' }, totalBlocked: { $sum: '$blocked' } } }
    ]);
    const stock = stockAgg[0] || {};

    const txnCount = await StockTransaction.countDocuments({});
    const recentTxns = await StockTransaction.find().sort({ createdAt: -1 }).limit(10).populate('item', 'sku name').populate('warehouse', 'code name');

    const adjustmentAgg = await InventoryAdjustment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        totalWarehouses,
        totalOnHand: stock.totalOnHand || 0,
        totalAvailable: stock.totalAvailable || 0,
        totalAllocated: stock.totalAllocated || 0,
        totalBlocked: stock.totalBlocked || 0,
        totalTransactions: txnCount,
        recentTransactions: recentTxns,
        adjustmentsByStatus: adjustmentAgg
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
