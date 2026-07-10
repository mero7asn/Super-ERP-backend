const mongoose = require('mongoose');

const payrollAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Anomaly', 'Fraud', 'Compliance', 'Recommendation', 'Info'],
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  runId:      { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', default: null },
  period:     { type: String, default: '' }, // "YYYY-MM"

  title:          { type: String, required: true },
  message:        { type: String, required: true },
  details:        { type: String, default: '' },
  confidenceScore: { type: Number, min: 0, max: 100, default: 75 }, // AI confidence %
  suggestedAction: { type: String, default: '' },
  policyRef:       { type: String, default: '' },
  estimatedImpact: { type: Number, default: 0 }, // financial impact in EGP

  status: {
    type: String,
    enum: ['Open', 'Acknowledged', 'Dismissed', 'Resolved'],
    default: 'Open'
  },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acknowledgedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('PayrollAlert', payrollAlertSchema);
