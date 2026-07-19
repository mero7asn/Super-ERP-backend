const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    required: true,
    min: [0, 'KPI score cannot be less than 0'],
    max: [100, 'KPI score cannot exceed 100']
  },
  achievementDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('KPI', kpiSchema);
