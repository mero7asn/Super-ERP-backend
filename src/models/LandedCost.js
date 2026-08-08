const mongoose = require('mongoose');

const landedCostSchema = new mongoose.Schema({
  landedCostNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  receivingOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceivingOrder',
    required: true
  },
  supplierName: {
    type: String,
    default: ''
  },
  originCountry: {
    type: String,
    default: ''
  },
  portOfEntry: {
    type: String,
    default: 'Alexandria'
  },
  containerNumber: {
    type: String,
    default: ''
  },
  billOfLading: {
    type: String,
    default: ''
  },
  aciNumber: { // Egyptian Customs ACI tracking
    type: String,
    default: ''
  },
  hsCode: {
    type: String,
    default: ''
  },
  customsDeclaration: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  costs: {
    purchaseBaseCost: { type: Number, default: 0 },
    freightCost: { type: Number, default: 0 },
    insuranceCost: { type: Number, default: 0 },
    customsCost: { type: Number, default: 0 },
    handlingCost: { type: Number, default: 0 },
    inlandTransportCost: { type: Number, default: 0 },
    otherCosts: { type: Number, default: 0 }
  },
  totalLandedCost: {
    type: Number,
    default: 0
  },
  allocationMethod: {
    type: String,
    enum: ['By Value', 'By Quantity', 'By Weight'],
    default: 'By Value'
  },
  allocatedLines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantity: { type: Number, default: 0 },
    purchaseUnitPrice: { type: Number, default: 0 },
    allocatedCost: { type: Number, default: 0 },
    unitLandedCost: { type: Number, default: 0 }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Calculated', 'Posted', 'Closed'],
    default: 'Draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

landedCostSchema.index({ landedCostNumber: 1 });
landedCostSchema.index({ receivingOrder: 1 });

module.exports = mongoose.model('LandedCost', landedCostSchema);
