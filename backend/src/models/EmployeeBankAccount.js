const mongoose = require('mongoose');

const employeeBankAccountSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  bankName:      { type: String, required: true },
  branchName:    { type: String, default: '' },
  branchCode:    { type: String, default: null }, // encrypted (optional)
  accountName:   { type: String, required: true },
  accountNumber: { type: String, default: null }, // encrypted
  iban:          { type: String, default: null },  // encrypted
  swiftCode:     { type: String, default: '' },

  // How this employee gets paid. BankAccount = real bank transfer.
  // 'FawryWallet' / 'PayMobWallet' kept for existing mobile-wallet flows.
  disbursementMethod: {
    type: String,
    enum: ['BankAccount', 'FawryWallet', 'PayMobWallet'],
    default: 'BankAccount',
  },

  // Which gateway/provider to use for this employee's disbursement.
  // For BankAccount this selects the provider that performs the bank transfer.
  preferredGateway: {
    type: String,
    enum: ['Fawry', 'PayMob', 'InstaPay', 'BankAPI', 'Amazon'],
    default: 'Fawry',
  },

  // Fawry-specific: mobile number linked to Fawry account
  fawryMobile: { type: String, default: null }, // encrypted

  // PayMob-specific: wallet number or card token
  paymobWallet: { type: String, default: null }, // encrypted

  isVerified: { type: Boolean, default: false },
  verifiedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt:  { type: Date, default: null },

  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Require real bank details when paying to a bank account
employeeBankAccountSchema.pre('save', function (next) {
  if (this.disbursementMethod === 'BankAccount') {
    if (!this.accountNumber && !this.iban) {
      return next(new Error('Bank account disbursement requires accountNumber or IBAN.'));
    }
  }
  next();
});


module.exports = mongoose.model('EmployeeBankAccount', employeeBankAccountSchema);
