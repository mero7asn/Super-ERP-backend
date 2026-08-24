const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    unique: true,
    required: true
  },
  requisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequisition'
  },
  title: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  numberOfPositions: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Open', 'On Hold', 'Closed', 'Filled', 'Cancelled'],
    default: 'Draft'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  isInternal: {
    type: Boolean,
    default: false
  },
  isExternal: {
    type: Boolean,
    default: false
  },
  internalVisible: {
    type: Boolean,
    default: false
  },
  externalVisible: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  closingDate: {
    type: Date
  },
  daysOpen: {
    type: Number,
    default: 0
  },
  jobDescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDescription'
  },
  skills: [{
    type: String
  }],
  benefits: [{
    type: String
  }],
  workingConditions: {
    type: String,
    enum: ['Remote', 'Hybrid', 'On-site'],
    default: 'On-site'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Generate job ID before save
jobSchema.pre('save', function(next) {
  if (!this.jobId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.jobId = `JOB-${year}${month}-${random}`;
  }
  next();
});

// Calculate days open before save
jobSchema.pre('save', function(next) {
  if (this.publishedAt && this.status === 'Open') {
    const now = new Date();
    const diffTime = Math.abs(now - this.publishedAt);
    this.daysOpen = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);
