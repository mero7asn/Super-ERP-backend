const mongoose = require('mongoose');

const customerInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  salesOrderRef: {
    type: String,
    default: ''
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
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
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
  eInvoiceStatus: {
    type: String,
    enum: ['Pending Submission', 'Queued', 'Submitted to ETA', 'ETA Accepted', 'ETA Rejected', 'Cancelled'],
    default: 'Pending Submission'
  },
  etaUuid: {
    type: String,
    default: ''
  },
  journalEntryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  }
}, { timestamps: true });

customerInvoiceSchema.index({ invoiceNumber: 1, customer: 1, status: 1 });

module.exports = mongoose.model('CustomerInvoice', customerInvoiceSchema);
