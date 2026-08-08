const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  purchaseRequisition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseRequisition',
    default: null
  },
  rfq: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    default: null
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: String,
    default: 'COMP-01'
  },
  branchId: {
    type: String,
    default: 'Cairo Branch'
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  procurementType: {
    type: String,
    enum: ['Local Procurement', 'Import Procurement'],
    default: 'Local Procurement'
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  incoterms: {
    type: String,
    default: 'FOB'
  },
  expectedDeliveryDate: {
    type: Date,
    required: true
  },
  promisedDeliveryDate: {
    type: Date,
    default: null
  },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    supplierSku: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, default: 0 },
    invoicedQty: { type: Number, default: 0 },
    vatPct: { type: Number, default: 14 },
    lineTotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  vatAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  grandTotalEgp: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      'Draft', 'Pending Approval', 'Approved', 'Sent to Supplier',
      'Supplier Confirmed', 'Partially Received', 'Fully Received',
      'Closed', 'Rejected', 'Cancelled', 'On Hold'
    ],
    default: 'Draft'
  },
  revisions: [{
    revisionNumber: { type: Number, default: 0 },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' }
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

purchaseOrderSchema.index({ poNumber: 1, supplier: 1, status: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
