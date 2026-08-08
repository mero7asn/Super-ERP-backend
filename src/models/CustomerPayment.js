const mongoose = require('mongoose');

const paymentVoucherSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Customer Receipt', 'Supplier Payment'],
    required: true
  },
  partyType: {
    type: String,
    enum: ['Lead', 'Supplier'],
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Check', 'Cash', 'Credit Card', 'Letter of Credit'],
    default: 'Bank Transfer'
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyBankAccount',
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  referenceNumber: {
    type: String,
    default: ''
  },
  allocatedInvoices: [{
    invoiceId: { type: String, required: true }, // CustomerInvoice or SupplierInvoice ID
    allocatedAmount: { type: Number, required: true }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Posted', 'Cancelled'],
    default: 'Posted'
  },
  journalEntryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  }
}, { timestamps: true });

paymentVoucherSchema.index({ paymentNumber: 1, type: 1, paymentDate: 1 });

module.exports = mongoose.model('PaymentVoucher', paymentVoucherSchema);
