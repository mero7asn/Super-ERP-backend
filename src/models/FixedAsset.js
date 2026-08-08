const mongoose = require('mongoose');

const fixedAssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Buildings & Real Estate', 'Vehicles & Logistics', 'Machinery & Factory Equipment', 'IT & Computer Hardware', 'Office Furniture', 'Tools & Fixtures'],
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  originalCostEgp: {
    type: Number,
    required: true,
    min: 0
  },
  usefulLifeYears: {
    type: Number,
    required: true,
    min: 1
  },
  residualValueEgp: {
    type: Number,
    default: 0
  },
  depreciationMethod: {
    type: String,
    enum: ['Straight Line', 'Declining Balance', 'Units of Production'],
    default: 'Straight Line'
  },
  accumulatedDepreciationEgp: {
    type: Number,
    default: 0
  },
  netBookValueEgp: {
    type: Number,
    required: true
  },
  costCenter: {
    type: String,
    default: 'Head Office'
  },
  status: {
    type: String,
    enum: ['Active', 'Fully Depreciated', 'Under Maintenance', 'Disposed', 'Scrapped'],
    default: 'Active'
  }
}, { timestamps: true });

fixedAssetSchema.index({ assetId: 1, category: 1, status: 1 });

module.exports = mongoose.model('FixedAsset', fixedAssetSchema);
