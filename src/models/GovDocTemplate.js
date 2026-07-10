const mongoose = require('mongoose');

const govDocTemplateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  labelAr: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false  // false = created by super admin, true = system default (not deletable)
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('GovDocTemplate', govDocTemplateSchema);
