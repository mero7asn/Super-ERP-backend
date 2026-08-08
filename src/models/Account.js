const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountCode: {
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
  accountType: {
    type: String,
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Cost of Goods Sold', 'Expense', 'Other Income', 'Other Expense'],
    required: true
  },
  normalBalance: {
    type: String,
    enum: ['Debit', 'Credit'],
    required: true
  },
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  isHeader: {
    type: Boolean,
    default: false
  },
  isSubledger: {
    type: Boolean,
    default: false
  },
  companyId: {
    type: String,
    default: 'COMP-01'
  },
  currentBalanceEgp: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

accountSchema.index({ accountCode: 1, accountType: 1 });

module.exports = mongoose.model('Account', accountSchema);
