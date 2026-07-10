const mongoose = require('mongoose');

const partnershipSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Health', 'Financial', 'Lifestyle', 'Education', 'Insurance', 'Transport', 'Other'],
    default: 'Other'
  },
  benefitDetails: {
    type: String,
    required: true
  },
  contactInfo: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Expired'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Partnership', partnershipSchema);
