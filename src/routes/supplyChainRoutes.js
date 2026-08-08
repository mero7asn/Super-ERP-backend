const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const scController = require('../controllers/supplyChainController');

router.use(protect);

// --- Control Tower & Analytics ---
router.get('/kpis', scController.getControlTowerKpis);
router.get('/planning/supply-gap', scController.getSupplyGapRecommendations);

// --- Suppliers & Scorecards ---
router.get('/suppliers', scController.getSuppliers);
router.post('/suppliers', scController.createSupplier);
router.patch('/suppliers/:id/block', scController.toggleBlockSupplier);

// --- Purchase Requisitions ---
router.get('/requisitions', scController.getRequisitions);
router.post('/requisitions', scController.createRequisition);
router.post('/requisitions/:id/approve', scController.approveRequisition);

// --- RFQs & Quotation Comparison Matrix ---
router.get('/rfqs', scController.getRFQs);
router.post('/rfqs', scController.createRFQ);
router.get('/quotations', scController.getQuotations);
router.post('/quotations', scController.createQuotation);
router.get('/comparison-matrix/:rfqId', scController.getComparisonMatrix);

// --- Purchase Orders & 3-Way Match ---
router.get('/purchase-orders', scController.getPurchaseOrders);
router.post('/purchase-orders', scController.createPurchaseOrder);
router.get('/three-way-matches', scController.getThreeWayMatches);
router.post('/three-way-matches/validate', scController.validateThreeWayMatchApi);

// --- Import Shipments & ACI/ACID Customs ---
router.get('/imports', scController.getImportShipments);
router.post('/imports', scController.createImportShipment);

// --- Contracts & Price Lists ---
router.get('/contracts', scController.getContracts);
router.post('/contracts', scController.createContract);

module.exports = router;
