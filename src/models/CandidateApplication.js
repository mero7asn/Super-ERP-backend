const mongoose = require('mongoose');

const candidateApplicationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected', 'Withdrawn'],
    default: 'Applied'
  },
  source: {
    type: String,
    enum: ['Company Careers Page', 'LinkedIn', 'Indeed', 'Wuzzuf', 'Forasna', 'Social Media', 'Referral', 'Internal', 'Manual', 'Other'],
    default: 'Manual'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  coverLetter: {
    type: String,
    default: ''
  },
  expectedSalary: {
    type: Number,
    default: 0
  },
  availableStartDate: {
    type: Date
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  isInternalApplicant: {
    type: Boolean,
    default: false
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('CandidateApplication', candidateApplicationSchema);
