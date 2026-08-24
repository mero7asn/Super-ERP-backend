const mongoose = require('mongoose');

const businessOpportunitySchema = new mongoose.Schema({
  opportunityId: {
    type: String,
    unique: true,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  opportunityType: {
    type: String,
    enum: ['Employee Benefits', 'Corporate Partnership', 'Vendor Partnership', 'Strategic Partnership', 'Sponsorship', 'Service Provider', 'Discount Partnership', 'Other'],
    default: 'Corporate Partnership'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  expectedValue: {
    type: Number,
    default: 0
  },
  expectedEmployeeBenefit: {
    type: String,
    default: ''
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  stage: {
    type: String,
    enum: ['Lead', 'Contacted', 'Discussion', 'Proposal', 'Negotiation', 'Approval', 'Partnership', 'Lost'],
    default: 'Lead'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  expectedClosingDate: {
    type: Date
  },
  nextAction: {
    type: String,
    default: ''
  },
  nextActionDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  convertedPartnershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership'
  }
}, { timestamps: true });

businessOpportunitySchema.pre('save', function(next) {
  if (!this.opportunityId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.opportunityId = `OPP-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.model('BusinessOpportunity', businessOpportunitySchema);
