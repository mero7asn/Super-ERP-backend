const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  journalNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  fiscalPeriod: {
    type: String,
    default: '2026-08'
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  sourceType: {
    type: String,
    enum: [
      'SALES_INVOICE_POSTED', 'PURCHASE_INVOICE_POSTED', 'CUSTOMER_PAYMENT_POSTED',
      'SUPPLIER_PAYMENT_POSTED', 'INVENTORY_ISSUE_POSTED', 'GOODS_RECEIPT_POSTED',
      'PAYROLL_POSTED', 'ASSET_DEPRECIATED', 'MANUAL_JOURNAL'
    ],
    default: 'MANUAL_JOURNAL'
  },
  sourceId: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  lines: [{
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    baseAmountEgp: { type: Number, required: true },
    costCenter: { type: String, default: '' },
    project: { type: String, default: '' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    description: { type: String, default: '' }
  }],
  totalDebit: {
    type: Number,
    required: true
  },
  totalCredit: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Posted', 'Reversed', 'Cancelled'],
    default: 'Draft'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  postedAt: {
    type: Date,
    default: null
  },
  reversedJournalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  }
}, { timestamps: true });

journalEntrySchema.index({ journalNumber: 1, date: 1, status: 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
