const mongoose = require('mongoose');

const employeeBenefitSchema = new mongoose.Schema({
  benefitId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership'
  },
  partnerName: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Health & Wellness', 'Financial', 'Lifestyle & Leisure', 'Education & Training', 'Insurance', 'Transportation', 'Food & Dining', 'Shopping', 'Technology', 'Family', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    default: ''
  },
  eligibility: {
    type: String,
    enum: ['All Employees', 'Specific Department', 'Specific Location', 'Specific Employment Type', 'Specific Grade', 'Selected Employees'],
    default: 'All Employees'
  },
  eligibleDepartments: [{
    type: String
  }],
  eligibleLocations: [{
    type: String
  }],
  discountPercentage: {
    type: Number,
    default: 0
  },
  discountValue: {
    type: Number,
    default: 0
  },
  howToUse: {
    type: String,
    default: ''
  },
  instructions: {
    type: String,
    default: ''
  },
  expirationDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Expired', 'Suspended'],
    default: 'Draft'
  },
  terms: {
    type: String,
    default: ''
  },
  internalLink: {
    type: String,
    default: ''
  },
  externalLink: {
    type: String,
    default: ''
  },
  employeeVisibility: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

employeeBenefitSchema.pre('save', function(next) {
  if (!this.benefitId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.benefitId = `BNF-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.model('EmployeeBenefit', employeeBenefitSchema);
