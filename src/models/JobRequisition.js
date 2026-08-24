const mongoose = require('mongoose');

const jobRequisitionSchema = new mongoose.Schema({
  requisitionId: {
    type: String,
    unique: true,
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  positionTitle: {
    type: String,
    required: true
  },
  numberOfEmployees: {
    type: Number,
    default: 1
  },
  employmentType: {
    type: String,
    enum: ['Full Time', 'Part Time', 'Contract', 'Temporary', 'Internship'],
    default: 'Full Time'
  },
  location: {
    type: String,
    default: ''
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'EGP' }
  },
  reasonForHiring: {
    type: String,
    enum: ['New Position', 'Replacement', 'Expansion', 'Other'],
    required: true
  },
  replacementEmployee: {
    type: String,
    default: ''
  },
  requiredSkills: [{
    type: String
  }],
  requestedStartDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  approvalStatus: {
    type: String,
    enum: ['Draft', 'Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Converted to Job', 'Cancelled'],
    default: 'Draft'
  },
  taOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalHistory: [{
    action: String,
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionAt: { type: Date, default: Date.now },
    comments: String
  }],
  notes: {
    type: String,
    default: ''
  },
  convertedJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }
}, { timestamps: true });

// Generate requisition ID before save
jobRequisitionSchema.pre('save', function(next) {
  if (!this.requisitionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.requisitionId = `REQ-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.model('JobRequisition', jobRequisitionSchema);
