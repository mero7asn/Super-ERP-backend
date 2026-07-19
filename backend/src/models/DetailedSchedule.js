const mongoose = require('mongoose');

const detailedScheduleSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // "YYYY-MM"
    required: true
  },
  // Default base configuration for the whole month
  defaultShift: {
    type: String,
    default: 'Day Shift (09:00 - 17:00)'
  },
  defaultOffDays: {
    type: [String],
    default: ['Friday', 'Saturday']
  },
  defaultLiveTarget: {
    type: Number,
    default: 480
  },
  defaultBreakTarget: {
    type: Number,
    default: 60
  },
  defaultTrainingTarget: {
    type: Number,
    default: 0
  },
  defaultCoachingTarget: {
    type: Number,
    default: 0
  },
  // Weekly overrides (e.g., Week 1, Week 2, Week 3, Week 4, Week 5)
  weeklyOverrides: {
    type: Map,
    of: {
      shift: String,
      weeklyOffDays: [String]
    },
    default: {}
  },
  // Daily overrides for specific calendar dates (YYYY-MM-DD)
  dailyOverrides: {
    type: Map,
    of: {
      shift: String,
      isOffDay: Boolean,
      customStartTime: String,
      customEndTime: String,
      liveTarget: Number,
      breakTarget: Number,
      trainingTarget: Number,
      coachingTarget: Number
    },
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

detailedScheduleSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('DetailedSchedule', detailedScheduleSchema);
