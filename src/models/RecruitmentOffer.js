const mongoose = require('mongoose');

const recruitmentOfferSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CandidateApplication',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  salary: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  benefits: [{
    type: String
  }],
  expectedJoiningDate: {
    type: Date
  },
  probationPeriod: {
    type: Number,
    default: 3
  },
  employmentType: {
    type: String,
    enum: ['Full Time', 'Part Time', 'Contract', 'Temporary'],
    default: 'Full Time'
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Withdrawn'],
    default: 'Draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sentDate: {
    type: Date
  },
  responseDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('RecruitmentOffer', recruitmentOfferSchema);
