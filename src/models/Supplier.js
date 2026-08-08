const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameAr: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    enum: ['Local Supplier', 'Foreign / Import Supplier', 'Service Provider', 'Contractor'],
    default: 'Local Supplier'
  },
  contactPerson: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: 'Egypt' }
  },
  taxRegistrationId: { // Egyptian Tax ID / Commercial Registration
    type: String,
    default: ''
  },
  commercialRegistrationNumber: {
    type: String,
    default: ''
  },
  bankAccount: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    iban: { type: String, default: '' },
    swiftCode: { type: String, default: '' }
  },
  paymentTerms: {
    type: String,
    enum: ['Immediate / Cash', 'Net 15', 'Net 30', 'Net 60', 'Net 90', 'Advance Payment'],
    default: 'Net 30'
  },
  incoterms: {
    type: String,
    enum: ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP', 'N/A'],
    default: 'N/A'
  },
  status: {
    type: String,
    enum: ['Approved', 'Conditional', 'Under Review', 'Blocked', 'Inactive'],
    default: 'Approved'
  },
  blockedReason: {
    type: String,
    default: ''
  },
  performanceScore: {
    overall: { type: Number, default: 90 }, // 0 - 100%
    onTimeDeliveryPct: { type: Number, default: 95 },
    qualityAcceptancePct: { type: Number, default: 98 },
    priceScore: { type: Number, default: 88 },
    leadTimeAdherencePct: { type: Number, default: 92 },
    totalSpendEgp: { type: Number, default: 0 },
    totalOrdersCount: { type: Number, default: 0 }
  },
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

supplierSchema.index({ supplierCode: 1, name: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
