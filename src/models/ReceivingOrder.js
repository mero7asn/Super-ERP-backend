const mongoose = require('mongoose');

const receivingOrderSchema = new mongoose.Schema({
  receivingId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  poNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  supplierName: {
    type: String,
    default: ''
  },
  supplierRef: {
    type: String,
    default: ''
  },
  asnNumber: {
    type: String,
    default: '',
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
  status: {
    type: String,
    enum: ['Draft', 'Expected', 'Received', 'Inspection', 'Putaway', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  lines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    expectedQty: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, default: 0, min: 0 },
    acceptedQty: { type: Number, default: 0, min: 0 },
    rejectedQty: { type: Number, default: 0, min: 0 },
    uom: { type: String, default: 'EA', uppercase: true },
    lotNumber: { type: String, default: '', uppercase: true },
    serialNumbers: [{ type: String, uppercase: true }],
    countryOfOrigin: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    unitCost: { type: Number, default: 0 },
    qualityStatus: {
      type: String,
      enum: ['Pending', 'Passed', 'Failed', 'Quarantine'],
      default: 'Pending'
    },
    damageNotes: { type: String, default: '' },
    suggestedLocator: { type: String, default: '', uppercase: true },
    actualLocator: { type: String, default: '', uppercase: true },
    overrideReason: { type: String, default: '' }
  }],
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  inspectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  putawayBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  goodsReceiptTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  receivedAt: {
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

receivingOrderSchema.index({ receivingId: 1 });
receivingOrderSchema.index({ poNumber: 1, status: 1 });
receivingOrderSchema.index({ warehouse: 1, status: 1 });

module.exports = mongoose.model('ReceivingOrder', receivingOrderSchema);
