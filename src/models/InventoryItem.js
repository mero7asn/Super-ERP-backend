const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  baseUom: {
    type: String,
    required: true,
    default: 'EA',
    uppercase: true
  },
  alternateUoms: [{
    uom: { type: String, required: true, uppercase: true },
    conversionFactor: { type: Number, required: true, min: 0.01 }
  }],
  unitCost: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  weight: {
    type: Number,
    default: 0,
    min: 0
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, default: 'cm' }
  },
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Discontinued', 'Blocked'],
    default: 'Active'
  },
  lotControl: {
    type: Boolean,
    default: false
  },
  serialControl: {
    type: Boolean,
    default: false
  },
  shelfLifeDays: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  maxStockLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  minOrderQty: {
    type: Number,
    default: 1,
    min: 1
  },
  imageUrl: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

inventoryItemSchema.index({ name: 'text', category: 'text' });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
