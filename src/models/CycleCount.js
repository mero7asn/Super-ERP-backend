const mongoose = require('mongoose');

const cycleCountSchema = new mongoose.Schema({
  countId: {
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
  countType: {
    type: String,
    enum: ['FULL', 'CYCLE', 'AD_HOC'],
    required: true
  },
  countMethod: {
    type: String,
    enum: ['BLIND', 'VISIBLE'],
    default: 'BLIND'
  },
  status: {
    type: String,
    enum: ['Draft', 'In Progress', 'Completed', 'Posted', 'Cancelled'],
    default: 'Draft'
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
  abcClass: {
    type: String,
    enum: ['A', 'B', 'C', null],
    default: null
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    default: null
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
  adjustmentTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  varianceValue: {
    type: Number,
    default: 0
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

cycleCountSchema.index({ countId: 1 });
cycleCountSchema.index({ warehouse: 1, subinventory: 1, status: 1 });

module.exports = mongoose.model('CycleCount', cycleCountSchema);
