const mongoose = require('mongoose');

const employeeLoanSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loanType: {
    type: String,
    enum: ['Personal Loan', 'Salary Advance', 'Emergency Loan', 'Housing Loan'],
    default: 'Personal Loan'
  },
  principalAmount:    { type: Number, required: true },
  remainingBalance:   { type: Number, required: true },
  monthlyInstallment: { type: Number, required: true },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date },
  totalMonths: { type: Number, default: 1 },
  reason:     { type: String, default: '' },
  status: {
    type: String,
    enum: ['Active', 'Settled', 'Defaulted', 'Paused'],
    default: 'Active'
  },
  // Payment history
  installments: [{
    period:       { type: String }, // "YYYY-MM"
    amount:       { type: Number },
    paidAt:       { type: Date, default: Date.now },
    balanceAfter: { type: Number }
  }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('EmployeeLoan', employeeLoanSchema);
