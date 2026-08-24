const mongoose = require('mongoose');

const jobPublicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  platform: {
    type: String,
    enum: ['Company Careers Page', 'LinkedIn', 'Indeed', 'Wuzzuf', 'Forasna', 'Social Media', 'Manual', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Not Published', 'Publishing', 'Published', 'Expired', 'Failed'],
    default: 'Not Published'
  },
  publishedDate: {
    type: Date
  },
  expirationDate: {
    type: Date
  },
  externalUrl: {
    type: String,
    default: ''
  },
  publicJobLink: {
    type: String,
    default: ''
  },
  applicationsReceived: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    default: ''
  },
  lastSynced: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('JobPublication', jobPublicationSchema);
