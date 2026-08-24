const mongoose = require('mongoose');

const employeeFeedbackSchema = new mongoose.Schema({
  feedbackType: {
    type: String,
    enum: ['Benefit Feedback', 'Event Feedback', 'Culture Program Feedback', 'Partnership Feedback', 'General Feedback'],
    default: 'General Feedback'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultureProgram'
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultureEvent'
  },
  benefitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeBenefit'
  },
  partnershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership'
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('EmployeeFeedback', employeeFeedbackSchema);
