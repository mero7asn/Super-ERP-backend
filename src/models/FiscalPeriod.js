const mongoose = require('mongoose');

const fiscalPeriodSchema = new mongoose.Schema({
  periodKey: {
    type: String, // e.g. '2026-08'
    required: true,
    unique: true
  },
  year: {
    type: Number,
    required: true
  },
  periodNumber: {
    type: Number,
    required: true
  },
  periodName: {
    type: String, // e.g. 'August 2026'
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'Closing in Progress', 'Closed', 'Locked'],
    default: 'Open'
  },
  closingChecklist: {
    bankReconciled: { type: Boolean, default: false },
    arReconciled: { type: Boolean, default: false },
    apReconciled: { type: Boolean, default: false },
    inventoryReconciled: { type: Boolean, default: false },
    vatReconciled: { type: Boolean, default: false },
    depreciationPosted: { type: Boolean, default: false },
    payrollPosted: { type: Boolean, default: false }
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

fiscalPeriodSchema.index({ periodKey: 1, status: 1 });

module.exports = mongoose.model('FiscalPeriod', fiscalPeriodSchema);
