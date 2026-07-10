const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  period: { type: String, required: true }, // "YYYY-MM"
  type: {
    type: String,
    enum: ['Salary', 'Bonus'],
    default: 'Salary',
  },
  status: {
    type: String,
    enum: ['Draft', 'Processing', 'Approved', 'PendingRelease', 'Released', 'Archived'],
    default: 'Draft'
  },
  // Financial totals (populated after generation)
  totalGross:       { type: Number, default: 0 },
  totalNet:         { type: Number, default: 0 },
  totalTax:         { type: Number, default: 0 },
  totalDeductions:  { type: Number, default: 0 },
  totalBonuses:     { type: Number, default: 0 },
  totalAllowances:  { type: Number, default: 0 },
  headcount:        { type: Number, default: 0 },

  // Audit trail
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:   { type: Date, default: null },
  releaseRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  releaseRequestedAt: { type: Date, default: null },
  releasedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  releasedAt:   { type: Date, default: null },

  // ── Linked company source bank account (money goes OUT from here) ──
  sourceAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyBankAccount', default: null },

  // 'live' = call the real gateway and move money; 'simulation' = no real funds moved.
  disbursementMode: { type: String, enum: ['live', 'simulation'], default: 'simulation' },

  // Snapshot of the source account at release time (immutable audit record)
  sourceAccountSnapshot: {
    bankName:    { type: String, default: '' },
    accountName: { type: String, default: '' },
    ibanMasked:  { type: String, default: '' },
    accountMasked: { type: String, default: '' },
    provider:    { type: String, default: '' },
  },

  notes: { type: String, default: '' },
}, { timestamps: true });

// Unique index — one salary run per period; bonus runs are unrestricted
payrollRunSchema.index({ period: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'Salary' } });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
