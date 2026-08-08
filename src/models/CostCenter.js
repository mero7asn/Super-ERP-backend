const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema({
  code: {
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
  type: {
    type: String,
    enum: ['Cost Center', 'Profit Center'],
    default: 'Cost Center'
  },
  department: {
    type: String,
    default: 'General'
  },
  branch: {
    type: String,
    default: 'Cairo Branch'
  },
  annualBudgetEgp: {
    type: Number,
    default: 0
  },
  actualExpensesEgp: {
    type: Number,
    default: 0
  },
  committedExpensesEgp: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

costCenterSchema.index({ code: 1, type: 1 });

module.exports = mongoose.model('CostCenter', costCenterSchema);
