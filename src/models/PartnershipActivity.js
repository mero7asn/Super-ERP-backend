const mongoose = require('mongoose');

const partnershipActivitySchema = new mongoose.Schema({
  partnership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership'
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessOpportunity'
  },
  activityType: {
    type: String,
    enum: ['Initial Contact', 'Meeting', 'Email', 'Call', 'Proposal Sent', 'Proposal Received', 'Negotiation', 'Agreement Signed', 'Renewal Discussion', 'Note', 'Other'],
    default: 'Note'
  },
  date: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  nextAction: {
    type: String,
    default: ''
  },
  nextActionDate: {
    type: Date
  },
  attachments: [{
    name: String,
    url: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('PartnershipActivity', partnershipActivitySchema);
