const mongoose = require('mongoose');

const recruitmentActivitySchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['JobRequisition', 'Job', 'Candidate', 'CandidateApplication', 'Interview', 'Offer', 'JobPublication'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  },
  action: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

recruitmentActivitySchema.index({ entityType: 1, entityId: 1 });
recruitmentActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('RecruitmentActivity', recruitmentActivitySchema);
