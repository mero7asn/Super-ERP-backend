const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  industry: {
    type: String,
    default: ''
  },
  contactPerson: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
