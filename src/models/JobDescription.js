const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  reportsTo: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  employmentType: {
    type: String,
    enum: ['Full Time', 'Part Time', 'Contract', 'Temporary', 'Internship'],
    default: 'Full Time'
  },
  experienceLevel: {
    type: String,
    enum: ['Entry', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'Executive'],
    default: 'Mid'
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'EGP' },
    showPublicly: { type: Boolean, default: false }
  },
  jobSummary: {
    type: String,
    default: ''
  },
  responsibilities: [{
    type: String
  }],
  requirements: [{
    type: String
  }],
  skills: [{
    type: String
  }],
  qualifications: [{
    degree: String,
    field: String,
    required: Boolean
  }],
  benefits: [{
    type: String
  }],
  workingConditions: {
    type: String,
    enum: ['Remote', 'Hybrid', 'On-site'],
    default: 'On-site'
  },
  approvalStatus: {
    type: String,
    enum: ['Draft', 'Pending Review', 'Approved', 'Published'],
    default: 'Draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('JobDescription', jobDescriptionSchema);
