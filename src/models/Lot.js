const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  lotNumber: {
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
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  productionDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  bestBeforeDate: {
    type: Date,
    default: null
  },
  countryOfOrigin: {
    type: String,
    default: ''
  },
  supplierBatch: {
    type: String,
    default: '',
    uppercase: true
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['Unrestricted', 'Quality Inspection', 'Blocked', 'Restricted'],
    default: 'Unrestricted'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

lotSchema.index({ lotNumber: 1 });
lotSchema.index({ item: 1, warehouse: 1 });

module.exports = mongoose.model('Lot', lotSchema);
