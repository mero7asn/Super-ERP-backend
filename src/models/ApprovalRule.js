const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  ruleName: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: String,
    enum: ['INVENTORY', 'PROCUREMENT', 'REQUISITION'],
    default: 'INVENTORY'
  },
  transactionType: {
    type: String,
    enum: ['STOCK_ADJUSTMENT', 'INTERNAL_REQUISITION', 'PURCHASE_ORDER', 'STOCK_TRANSFER'],
    required: true
  },
  minAmount: {
    type: Number,
    default: 0
  },
  maxAmount: {
    type: Number,
    default: Number.MAX_SAFE_INTEGER
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  approverRoles: [{
    type: String,
    required: true
  }],
  autoApproveBelow: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

approvalRuleSchema.index({ module: 1, transactionType: 1 });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
