const mongoose = require('mongoose');

const auxScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // "YYYY-MM"
  monthlyPlan: {
    liveMinutes:     { type: Number, default: 480 },
    breakMinutes:    { type: Number, default: 60 },
    trainingMinutes: { type: Number, default: 0 },
    coachingMinutes: { type: Number, default: 0 },
  },
  weeklyOverrides: [{
    weekLabel:       String,
    weekStart:       Date,
    weekEnd:         Date,
    liveMinutes:     Number,
    breakMinutes:    Number,
    trainingMinutes: Number,
    coachingMinutes: Number,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

auxScheduleSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('AuxSchedule', auxScheduleSchema);
