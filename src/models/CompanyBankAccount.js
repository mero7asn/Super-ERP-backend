const mongoose = require('mongoose');

/**
 * CompanyBankAccount
 * The REAL company bank account that payroll money is debited FROM.
 * One or more can be configured; a PayrollRun links to one as its source.
 * All sensitive fields are stored AES-256-GCM encrypted (see gatewayController).
 */
const companyBankAccountSchema = new mongoose.Schema({
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
  },
  branchName: { type: String, default: '' },
  branchCode: { type: String, default: '' }, // encrypted (e.g. CBE branch code)

  accountName:    { type: String, required: true, trim: true }, // legal account holder
  accountNumber:  { type: String, default: null }, // encrypted
  iban:           { type: String, default: null }, // encrypted
  swiftCode:      { type: String, default: '' },
  currency:       { type: String, default: 'EGP' },

  // Provider used to move money out of this account.
  // 'Fawry' | 'PayMob' | 'InstaPay' | 'BankAPI' | 'Manual'
  disbursementProvider: {
    type: String,
    enum: ['Fawry', 'PayMob', 'InstaPay', 'BankAPI', 'Manual'],
    default: 'Fawry',
  },

  isDefault:   { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },

  // Monthly cap (EGP) — hard safety limit on total disbursed from this account.
  monthlyLimit: { type: Number, default: 0 },

  // Audit
  configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt:   { type: Date, default: null },
  notes:        { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CompanyBankAccount', companyBankAccountSchema);
