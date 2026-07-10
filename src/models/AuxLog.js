const mongoose = require('mongoose');

const auxLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Live', 'Training', 'Break', 'Coaching', 'Logged out'], required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  durationMinutes: { type: Number, default: null }
}, { timestamps: false });

module.exports = mongoose.model('AuxLog', auxLogSchema);
