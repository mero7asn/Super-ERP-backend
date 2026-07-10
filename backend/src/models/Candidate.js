const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  vacancyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobVacancy',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  resumeUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'],
    default: 'Applied'
  },
  interviewerNotes: [{
    note: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
