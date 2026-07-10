const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  payrollRunId:  { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
  payrollEntryId:{ type: mongoose.Schema.Types.ObjectId, ref: 'PayrollEntry', required: true },
  employeeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  gateway:  { type: String, enum: ['Fawry', 'PayMob', 'InstaPay', 'BankAPI', 'Manual'], required: true },
  amount:   { type: Number, required: true },
  currency: { type: String, default: 'EGP' },

  // 'BankAccount' | 'FawryWallet' | 'PayMobWallet'
  disbursementMethod: { type: String, enum: ['BankAccount', 'FawryWallet', 'PayMobWallet'], default: 'BankAccount' },

  // Live (real funds moved) or simulation (no funds moved)
  liveMode: { type: Boolean, default: false },

  // Company source account this payment was debited from
  sourceAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyBankAccount', default: null },

  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Success', 'Failed', 'Refunded', 'Reversed'],
    default: 'Pending',
  },

  // Gateway reference IDs
  gatewayRefId:      { type: String, default: null }, // gateway's transaction ID
  gatewayOrderId:    { type: String, default: null }, // our order ID sent to gateway
  gatewayRawResponse:{ type: mongoose.Schema.Types.Mixed, default: null }, // full response object

  failureCode:   { type: String, default: null },
  failureReason: { type: String, default: null },

  // Webhook reconciliation
  webhookRawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  webhookReceivedAt:  { type: Date, default: null },
  paymentConfirmedAt: { type: Date, default: null },

  attemptCount: { type: Number, default: 1 },
  lastAttemptAt:{ type: Date, default: Date.now },

  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paymentTransactionSchema.index({ payrollRunId: 1 });
paymentTransactionSchema.index({ employeeId: 1 });
paymentTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
