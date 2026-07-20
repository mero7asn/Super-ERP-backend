const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getStockLevels, getStockTransactions, postGoodsReceipt, postGoodsIssue,
  createStockTransfer, postInventoryAdjustment, createReceivingOrder, updateReceivingOrder,
  createShipment, createReturnOrder, createCycleCount, createPhysicalInventory,
  getInventoryKPIs, getWarehouses, createWarehouse, updateWarehouse,
  getLots, getSerials, approveAdjustment, rejectAdjustment,
  getReceivingOrders, getShipments, createTransfer, getTransfers,
  createAdjustment, getAdjustments, getCycleCounts, getPhysicalInventories
} = require('../controllers/inventoryController');

const INVENTORY_ROLES = [
  'Super CRM Administrator', 'System Architect', 'Inventory Manager',
  'Warehouse Manager', 'Receiving Clerk', 'Shipping Clerk',
  'Warehouse Operator', 'Inventory Clerk', 'Quality Inspector'
];

const authorizeInventory = (req, res, next) => {
  if (!INVENTORY_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Not authorized for inventory operations' });
  }
  next();
};

router.use(protect);
router.use(authorizeInventory);

router.get('/items', getInventoryItems);
router.post('/items', createInventoryItem);
router.put('/items/:id', updateInventoryItem);
router.delete('/items/:id', deleteInventoryItem);

router.get('/stock', getStockLevels);
router.get('/transactions', getStockTransactions);
router.get('/kpis', getInventoryKPIs);

router.post('/receipts/goods/:id', postGoodsReceipt);
router.post('/issues/goods/:id', postGoodsIssue);
router.post('/transfers/:id/execute', createStockTransfer);
router.post('/adjustments/:id/post', postInventoryAdjustment);
router.post('/adjustments/:id/approve', approveAdjustment);
router.post('/adjustments/:id/reject', rejectAdjustment);

router.post('/receiving-orders', createReceivingOrder);
router.put('/receiving-orders/:id', updateReceivingOrder);
router.get('/receiving-orders', getReceivingOrders);

router.post('/shipments', createShipment);
router.get('/shipments', getShipments);
router.post('/returns', createReturnOrder);

router.post('/transfers', createTransfer);
router.post('/transfers/:id/execute', createStockTransfer);
router.get('/transfers', getTransfers);

router.post('/adjustments', createAdjustment);
router.post('/adjustments/:id/post', postInventoryAdjustment);
router.post('/adjustments/:id/approve', approveAdjustment);
router.post('/adjustments/:id/reject', rejectAdjustment);
router.get('/adjustments', getAdjustments);

router.post('/cycle-counts', createCycleCount);
router.get('/cycle-counts', getCycleCounts);

router.post('/physical-inventories', createPhysicalInventory);
router.get('/physical-inventories', getPhysicalInventories);

router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);
router.put('/warehouses/:id', updateWarehouse);

router.get('/lots', getLots);
router.get('/serials', getSerials);

module.exports = router;
