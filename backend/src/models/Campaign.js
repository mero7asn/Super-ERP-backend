const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required']
  },
  platform: {
    type: String,
    enum: ['Meta', 'Google', 'Email', 'Other'],
    required: [true, 'Platform is required']
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Completed'],
    default: 'Draft'
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required']
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  formSlug: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
