const mongoose = require('mongoose');

const scheduleChangeLogSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedByRole: {
    type: String,
    default: ''
  },
  // Where the change was made from
  changeSource: {
    type: String,
    enum: ['RTM', 'Personal', 'HR', 'System'],
    default: 'HR'
  },
  month: {
    type: String, // "YYYY-MM"
    required: true
  },
  // Human-readable field name that changed
  field: {
    type: String,
    required: true
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  note: {
    type: String,
    default: ''
  }
}, { timestamps: true });

scheduleChangeLogSchema.index({ employeeId: 1, createdAt: -1 });
scheduleChangeLogSchema.index({ changedBy: 1 });

module.exports = mongoose.model('ScheduleChangeLog', scheduleChangeLogSchema);
