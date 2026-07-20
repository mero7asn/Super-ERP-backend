const mongoose = require('mongoose');

const pickTaskSchema = new mongoose.Schema({
  pickTaskId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
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
  status: {
    type: String,
    enum: ['Draft', 'Assigned', 'In Progress', 'Picked', 'Packed', 'Cancelled'],
    default: 'Draft'
  },
  pickingStrategy: {
    type: String,
    enum: ['DISCRETE', 'WAVE', 'ZONE', 'BATCH'],
    default: 'DISCRETE'
  },
  waveNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  zone: {
    type: String,
    default: '',
    uppercase: true
  },
  lines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    orderedQty: { type: Number, required: true, min: 0 },
    pickedQty: { type: Number, default: 0, min: 0 },
    uom: { type: String, default: 'EA', uppercase: true },
    lotNumber: { type: String, default: '', uppercase: true },
    serialNumbers: [{ type: String, uppercase: true }],
    sourceLocator: { type: String, default: '', uppercase: true },
    pickedAt: { type: Date, default: null },
    packCarton: { type: String, default: '', uppercase: true }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pickedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  packedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  goodsIssueTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
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

pickTaskSchema.index({ pickTaskId: 1 });
pickTaskSchema.index({ shipmentId: 1, status: 1 });
pickTaskSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('PickTask', pickTaskSchema);
