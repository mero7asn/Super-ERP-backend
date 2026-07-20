const mongoose = require('mongoose');

const physicalInventorySchema = new mongoose.Schema({
  piId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
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
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Draft', 'Counting', 'Under Review', 'Posted', 'Cancelled'],
    default: 'Draft'
  },
  countMethod: {
    type: String,
    enum: ['BLIND', 'VISIBLE'],
    default: 'BLIND'
  },
  freezeDate: {
    type: Date,
    default: null
  },
  lines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    locator: { type: String, required: true, uppercase: true },
    lotNumber: { type: String, default: '', uppercase: true },
    serialNumber: { type: String, default: '', uppercase: true },
    systemQty: { type: Number, required: true },
    countedQty: { type: Number, default: null },
    variance: { type: Number, default: null },
    countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    countedAt: { type: Date, default: null }
  }],
  totalItems: {
    type: Number,
    default: 0
  },
  totalVariance: {
    type: Number,
    default: 0
  },
  totalVarianceValue: {
    type: Number,
    default: 0
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  postedAt: {
    type: Date,
    default: null
  },
  postingTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

physicalInventorySchema.index({ piId: 1 });
physicalInventorySchema.index({ warehouse: 1, subinventory: 1, status: 1 });

module.exports = mongoose.model('PhysicalInventory', physicalInventorySchema);
