const mongoose = require('mongoose');

const supplierQuotationSchema = new mongoose.Schema({
  quotationNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  rfq: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  quotationDate: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
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
  leadTimeDays: {
    type: Number,
    required: true,
    default: 10
  },
  warrantyMonths: {
    type: Number,
    default: 12
  },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    supplierSku: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discountPct: { type: Number, default: 0 },
    vatPct: { type: Number, default: 14 },
    lineTotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  freightAmount: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'Accepted', 'Rejected'],
    default: 'Submitted'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

supplierQuotationSchema.index({ quotationNumber: 1, rfq: 1, supplier: 1 });

module.exports = mongoose.model('SupplierQuotation', supplierQuotationSchema);
