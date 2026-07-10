const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['HR', 'Technical'],
    required: true
  },
  assignedTrainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Assigned', 'In Progress', 'Completed'],
    default: 'Assigned'
  },
  report: {
    type: String,
    default: ''
  },
  performanceRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Training', trainingSchema);
