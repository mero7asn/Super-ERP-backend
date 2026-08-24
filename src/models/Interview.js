const mongoose = require('mongoose');

const interviewFeedbackSchema = new mongoose.Schema({
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  technicalSkills: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  communication: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  cultureFit: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  experience: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  recommendation: {
    type: String,
    enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire', 'Strong No Hire'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  strengths: {
    type: String,
    default: ''
  },
  weaknesses: {
    type: String,
    default: ''
  },
  isPrivate: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const interviewSchema = new mongoose.Schema({
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
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interviewType: {
    type: String,
    enum: ['Phone Screening', 'HR Interview', 'Technical Interview', 'Manager Interview', 'Final Interview', 'Panel Interview'],
    default: 'HR Interview'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 60
  },
  location: {
    type: String,
    default: ''
  },
  meetingLink: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'],
    default: 'Scheduled'
  },
  feedbackStatus: {
    type: String,
    enum: ['Pending', 'Submitted', 'Reviewed'],
    default: 'Pending'
  },
  feedbacks: [interviewFeedbackSchema],
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
