const mongoose = require('mongoose');

const serialSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  subinventory: {
    type: String,
    required: true,
    uppercase: true
  },
  locator: {
    type: String,
    default: '',
    uppercase: true
  },
  lotNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['Unrestricted', 'Quality Inspection', 'Blocked', 'Restricted', 'Sold', 'Shipped'],
    default: 'Unrestricted'
  },
  condition: {
    type: String,
    enum: ['New', 'Used', 'Refurbished', 'Damaged', 'Scrap'],
    default: 'New'
  },
  purchaseDate: {
    type: Date,
    default: null
  },
  warrantyExpiry: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

serialSchema.index({ serialNumber: 1 });
serialSchema.index({ item: 1, warehouse: 1 });

module.exports = mongoose.model('Serial', serialSchema);
