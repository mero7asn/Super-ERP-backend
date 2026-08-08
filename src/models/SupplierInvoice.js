const mongoose = require('mongoose');

const supplierInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  purchaseOrderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    default: null
  },
  receivingOrderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceivingOrder',
    default: null
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
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
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    vatPct: { type: Number, default: 14 },
    lineTotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  vatAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Draft', 'Posted', 'Partially Paid', 'Fully Paid', 'Cancelled', 'Overdue'],
    default: 'Draft'
  },
  matchStatus: {
    type: String,
    enum: ['Unmatched', '3-Way Matched', 'Discrepancy Flagged'],
    default: '3-Way Matched'
  },
  journalEntryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  }
}, { timestamps: true });

supplierInvoiceSchema.index({ invoiceNumber: 1, supplier: 1, status: 1 });

module.exports = mongoose.model('SupplierInvoice', supplierInvoiceSchema);
