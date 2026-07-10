const mongoose = require('mongoose');

const benefitSuggestionSchema = new mongoose.Schema({
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Health', 'Financial', 'Lifestyle', 'Education', 'Insurance', 'Transport', 'Other'],
    default: 'Other'
  },
  details: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Declined'],
    default: 'Pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('BenefitSuggestion', benefitSuggestionSchema);
