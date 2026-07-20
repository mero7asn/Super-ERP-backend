const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  transferId: {
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
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitOfMeasure: {
    type: String,
    default: 'EA',
    uppercase: true
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  fromSubinventory: {
    type: String,
    required: true,
    uppercase: true
  },
  fromLocator: {
    type: String,
    default: '',
    uppercase: true
  },
  fromLotNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  fromSerialNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  toSubinventory: {
    type: String,
    required: true,
    uppercase: true
  },
  toLocator: {
    type: String,
    default: '',
    uppercase: true
  },
  toLotNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  toSerialNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  transferType: {
    type: String,
    enum: ['BIN_TRANSFER', 'INTER_ORG', 'INTER_SITE', 'RETURN_TO_VENDOR'],
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'In Transit', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  shipmentRef: {
    type: String,
    default: ''
  },
  carrier: {
    type: String,
    default: ''
  },
  trackingNumber: {
    type: String,
    default: ''
  },
  expectedArrival: {
    type: Date,
    default: null
  },
  actualArrival: {
    type: Date,
    default: null
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  outboundTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  inboundTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

stockTransferSchema.index({ transferId: 1 });
stockTransferSchema.index({ item: 1, fromWarehouse: 1, toWarehouse: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
