const mongoose = require('mongoose');

const partnershipSchema = new mongoose.Schema({
  partnershipId: {
    type: String,
    unique: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  companyName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Health & Wellness', 'Financial', 'Lifestyle & Leisure', 'Education & Training', 'Insurance', 'Transportation', 'Food & Dining', 'Shopping', 'Technology', 'Family', 'Health', 'Lifestyle', 'Education', 'Transport', 'Other'],
    default: 'Other'
  },
  partnershipType: {
    type: String,
    enum: ['Employee Benefits', 'Corporate Partnership', 'Vendor Partnership', 'Strategic Partnership', 'Sponsorship', 'Service Provider', 'Discount Partnership', 'Other'],
    default: 'Corporate Partnership'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  renewalDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Prospect', 'Active', 'Pending Renewal', 'Expired', 'Suspended', 'Terminated'],
    default: 'Active'
  },
  agreement: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  partnershipValue: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  employeeBenefit: {
    type: String,
    default: ''
  },
  companyBenefit: {
    type: String,
    default: ''
  },
  cost: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  estimatedSavings: {
    type: Number,
    default: 0
  },
  benefitDetails: {
    type: String,
    default: ''
  },
  contactInfo: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

partnershipSchema.pre('save', function(next) {
  if (!this.partnershipId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.partnershipId = `PRT-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.models.Partnership || mongoose.model('Partnership', partnershipSchema);

