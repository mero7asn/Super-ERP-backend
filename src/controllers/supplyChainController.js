const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const RFQ = require('../models/RFQ');
const SupplierQuotation = require('../models/SupplierQuotation');
const QuotationComparison = require('../models/QuotationComparison');
const PurchaseOrder = require('../models/PurchaseOrder');
const ImportShipment = require('../models/ImportShipment');
const SupplierContract = require('../models/SupplierContract');
const ThreeWayMatch = require('../models/ThreeWayMatch');
const InventoryItem = require('../models/InventoryItem');
const {
  recalculateSupplierScore,
  validateThreeWayMatch,
  calculateSupplyGapAndRecommendations
} = require('../services/supplyChainService');

// --- Suppliers & Scorecards ---
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch suppliers', error: err.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const count = await Supplier.countDocuments();
    const supplierCode = req.body.supplierCode || `SUP-${String(count + 101).padStart(4, '0')}`;
    const supplier = await Supplier.create({ ...req.body, supplierCode });
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create supplier', error: err.message });
  }
};

exports.toggleBlockSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, blockedReason } = req.body;
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    supplier.status = status || (supplier.status === 'Blocked' ? 'Approved' : 'Blocked');
    if (blockedReason) supplier.blockedReason = blockedReason;
    await supplier.save();

    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update supplier status', error: err.message });
  }
};

// --- Purchase Requisitions ---
exports.getRequisitions = async (req, res) => {
  try {
    const reqs = await PurchaseRequisition.find()
      .populate('requester', 'firstName lastName email')
      .populate('items.item', 'sku name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reqs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch purchase requisitions', error: err.message });
  }
};

exports.createRequisition = async (req, res) => {
  try {
    const prNumber = `PR-${Date.now().toString().slice(-6)}`;
    const pr = await PurchaseRequisition.create({
      ...req.body,
      prNumber,
      requester: req.user._id,
      status: 'Submitted'
    });
    res.status(201).json({ success: true, data: pr });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create purchase requisition', error: err.message });
  }
};

exports.approveRequisition = async (req, res) => {
  try {
    const pr = await PurchaseRequisition.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Purchase Requisition not found' });

    pr.status = 'Approved';
    pr.approvedBy = req.user._id;
    pr.approvedAt = new Date();
    await pr.save();

    res.json({ success: true, data: pr });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve purchase requisition', error: err.message });
  }
};

// --- RFQs & Quotations ---
exports.getRFQs = async (req, res) => {
  try {
    const rfqs = await RFQ.find()
      .populate('invitedSuppliers.supplier', 'name category email')
      .populate('items.item', 'sku name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: rfqs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch RFQs', error: err.message });
  }
};

exports.createRFQ = async (req, res) => {
  try {
    const rfqNumber = `RFQ-${Date.now().toString().slice(-6)}`;
    const rfq = await RFQ.create({
      ...req.body,
      rfqNumber,
      createdBy: req.user._id,
      status: 'Published'
    });
    res.status(201).json({ success: true, data: rfq });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create RFQ', error: err.message });
  }
};

exports.getQuotations = async (req, res) => {
  try {
    const { rfqId } = req.query;
    const query = rfqId ? { rfq: rfqId } : {};
    const quotations = await SupplierQuotation.find(query)
      .populate('supplier', 'name category performanceScore')
      .populate('items.item', 'sku name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: quotations });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch supplier quotations', error: err.message });
  }
};

exports.createQuotation = async (req, res) => {
  try {
    const quotationNumber = `QUO-${Date.now().toString().slice(-6)}`;
    const quotation = await SupplierQuotation.create({
      ...req.body,
      quotationNumber
    });
    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    res.status(400).json({ message: 'Failed to submit supplier quotation', error: err.message });
  }
};

// --- Quotation Comparison Matrix ---
exports.getComparisonMatrix = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const quotations = await SupplierQuotation.find({ rfq: rfqId }).populate('supplier', 'name category performanceScore');
    if (quotations.length === 0) {
      return res.status(404).json({ message: 'No quotations found for this RFQ' });
    }

    const lowestPrice = Math.min(...quotations.map(q => q.grandTotal));
    const fastestLeadTime = Math.min(...quotations.map(q => q.leadTimeDays || 10));

    const scored = quotations.map(q => {
      const priceScore = lowestPrice > 0 ? Math.round((lowestPrice / q.grandTotal) * 100) : 100;
      const leadTimeScore = q.leadTimeDays > 0 ? Math.round((fastestLeadTime / q.leadTimeDays) * 100) : 100;
      const qualityScore = q.supplier?.performanceScore?.qualityAcceptancePct || 95;

      const totalCompositeScore = Math.round((priceScore * 0.40) + (qualityScore * 0.35) + (leadTimeScore * 0.25));
      return {
        quotation: q._id,
        supplier: q.supplier,
        grandTotalEgp: q.grandTotal,
        leadTimeDays: q.leadTimeDays,
        priceScore,
        leadTimeScore,
        qualityScore,
        totalCompositeScore
      };
    });

    scored.sort((a, b) => b.totalCompositeScore - a.totalCompositeScore);

    res.json({
      success: true,
      rfqId,
      recommendedSupplier: scored[0]?.supplier,
      comparisonMatrix: scored
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate quotation comparison matrix', error: err.message });
  }
};

// --- Purchase Orders ---
exports.getPurchaseOrders = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate('supplier', 'name category supplierCode')
      .populate('warehouse', 'code name')
      .populate('items.item', 'sku name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: pos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch purchase orders', error: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const count = await PurchaseOrder.countDocuments();
    const poNumber = req.body.poNumber || `PO-2026-${String(count + 101).padStart(4, '0')}`;
    const grandTotal = req.body.grandTotal || req.body.subtotal || 0;

    const po = await PurchaseOrder.create({
      ...req.body,
      poNumber,
      buyer: req.user._id,
      grandTotalEgp: grandTotal * (req.body.exchangeRate || 1.0),
      status: 'Approved'
    });

    // Update supplier performance score calculation
    if (po.supplier) {
      recalculateSupplierScore(po.supplier).catch(err => console.error(err));
    }

    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create purchase order', error: err.message });
  }
};

// --- Egyptian Import Shipments & ACI/ACID ---
exports.getImportShipments = async (req, res) => {
  try {
    const shipments = await ImportShipment.find()
      .populate('purchaseOrder')
      .populate('supplier', 'name country')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: shipments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch import shipments', error: err.message });
  }
};

exports.createImportShipment = async (req, res) => {
  try {
    const count = await ImportShipment.countDocuments();
    const shipmentNumber = `IMP-2026-${String(count + 101).padStart(4, '0')}`;
    const shipment = await ImportShipment.create({
      ...req.body,
      shipmentNumber
    });
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create import shipment', error: err.message });
  }
};

// --- 3-Way Matching ---
exports.getThreeWayMatches = async (req, res) => {
  try {
    const matches = await ThreeWayMatch.find()
      .populate('purchaseOrder', 'poNumber supplier grandTotalEgp')
      .populate('receivingOrder', 'receivingId supplierName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: matches });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch 3-way matches', error: err.message });
  }
};

exports.validateThreeWayMatchApi = async (req, res) => {
  try {
    const { poId, receivingId, supplierInvoiceNumber, invoiceAmountEgp } = req.body;
    const matchRecord = await validateThreeWayMatch(poId, receivingId, supplierInvoiceNumber, Number(invoiceAmountEgp));
    res.json({ success: true, data: matchRecord });
  } catch (err) {
    res.status(500).json({ message: '3-way match validation failed', error: err.message });
  }
};

// --- Supplier Contracts ---
exports.getContracts = async (req, res) => {
  try {
    const contracts = await SupplierContract.find()
      .populate('supplier', 'name category')
      .populate('items.item', 'sku name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: contracts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch supplier contracts', error: err.message });
  }
};

exports.createContract = async (req, res) => {
  try {
    const contractNumber = `CNT-2026-${Date.now().toString().slice(-5)}`;
    const contract = await SupplierContract.create({
      ...req.body,
      contractNumber
    });
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create contract', error: err.message });
  }
};

// --- Control Tower KPIs & Analytics ---
exports.getControlTowerKpis = async (req, res) => {
  try {
    const totalSuppliers = await Supplier.countDocuments();
    const openPos = await PurchaseOrder.countDocuments({ status: { $in: ['Approved', 'Sent to Supplier', 'Supplier Confirmed', 'Partially Received'] } });
    const importShipmentsCount = await ImportShipment.countDocuments();
    const pendingPrsCount = await PurchaseRequisition.countDocuments({ status: 'Submitted' });

    const pos = await PurchaseOrder.find({});
    const totalSpendEgp = pos.reduce((sum, p) => sum + (p.grandTotalEgp || p.grandTotal || 0), 0);

    // Compute On-Time % from real PO delivery data
    const deliveredPos = pos.filter(p => p.status === 'Fully Received' && p.promisedDeliveryDate);
    let supplierOnTimeAvgPct = null;
    if (deliveredPos.length > 0) {
      const onTimeCount = deliveredPos.filter(p => new Date(p.updatedAt) <= new Date(p.promisedDeliveryDate)).length;
      supplierOnTimeAvgPct = Math.round((onTimeCount / deliveredPos.length) * 100);
    }

    // Compute landed cost from real import shipments
    const ImportShipmentModel = require('../models/ImportShipment');
    const shipments = await ImportShipmentModel.find({});
    const landedCostTotalEgp = shipments.reduce((sum, s) => {
      const lc = s.landedCost || {};
      return sum + (lc.totalLandedCostEgp || lc.customsDuty || 0);
    }, 0);

    const supplyGapRecs = await calculateSupplyGapAndRecommendations();

    res.json({
      success: true,
      data: {
        totalSpendEgp: Math.round(totalSpendEgp),
        openPurchaseOrders: openPos,
        importShipmentsCount,
        pendingPrsCount,
        totalSuppliersCount: totalSuppliers,
        supplierOnTimeAvgPct,
        supplyGapItemsCount: supplyGapRecs.length,
        landedCostTotalEgp: Math.round(landedCostTotalEgp)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch Supply Chain KPIs', error: err.message });
  }
};

exports.getSupplyGapRecommendations = async (req, res) => {
  try {
    const recs = await calculateSupplyGapAndRecommendations();
    res.json({ success: true, data: recs, count: recs.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate supply gap recommendations', error: err.message });
  }
};
