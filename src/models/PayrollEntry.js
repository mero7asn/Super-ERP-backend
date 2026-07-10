const mongoose = require('mongoose');

const payrollEntrySchema = new mongoose.Schema({
  runId:      { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period:     { type: String, required: true }, // "YYYY-MM"

  // --- EARNINGS ---
  baseSalary:        { type: Number, default: 0 },
  overtimeHours:     { type: Number, default: 0 },
  overtimeAmount:    { type: Number, default: 0 },
  shiftAllowance:    { type: Number, default: 0 },
  commissionAmount:  { type: Number, default: 0 },

  // --- BONUSES ---
  performanceBonus:  { type: Number, default: 0 },
  attendanceBonus:   { type: Number, default: 0 },
  holidayBonus:      { type: Number, default: 0 },
  otherBonus:        { type: Number, default: 0 },
  bonusNote:         { type: String, default: '' },

  // --- ALLOWANCES ---
  transportAllowance: { type: Number, default: 0 },
  housingAllowance:   { type: Number, default: 0 },
  mealAllowance:      { type: Number, default: 0 },
  mobileAllowance:    { type: Number, default: 0 },
  fuelAllowance:      { type: Number, default: 0 },

  // --- DEDUCTIONS ---
  incomeTax:          { type: Number, default: 0 },
  socialInsurance:    { type: Number, default: 0 },
  pension:            { type: Number, default: 0 },
  loanDeduction:      { type: Number, default: 0 },
  advanceDeduction:   { type: Number, default: 0 },
  leaveWithoutPayDays:{ type: Number, default: 0 },
  leaveWithoutPay:    { type: Number, default: 0 },
  otherDeductions:    { type: Number, default: 0 },

  // --- CALCULATED TOTALS ---
  grossEarnings:    { type: Number, default: 0 },
  totalAllowances:  { type: Number, default: 0 },
  totalBonuses:     { type: Number, default: 0 },
  totalDeductions:  { type: Number, default: 0 },
  netSalary:        { type: Number, default: 0 },

  // --- STATUS ---
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Paid', 'Failed', 'On Hold'],
    default: 'Pending'
  },
  paymentRef:    { type: String, default: '' },
  paymentDate:   { type: Date, default: null },
  failureReason: { type: String, default: '' },

  // Notes / manual overrides
  hrNotes:      { type: String, default: '' },
  isManualOverride: { type: Boolean, default: false },
  overrideBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

payrollEntrySchema.index({ runId: 1, employeeId: 1 }, { unique: true });
payrollEntrySchema.index({ employeeId: 1, period: 1 });

module.exports = mongoose.model('PayrollEntry', payrollEntrySchema);
