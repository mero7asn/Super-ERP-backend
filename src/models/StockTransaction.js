const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: [
      'GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER', 'ADJUSTMENT',
      'RETURN_RECEIPT', 'CYCLE_COUNT', 'PHYSICAL_INVENTORY',
      'RESERVATION', 'ALLOCATION', 'RELEASE'
    ],
    required: true
  },
  subtype: {
    type: String,
    enum: [
      'PO_RECEIPT', 'PRODUCTION_COMPLETION', 'MANUAL_RECEIPT',
      'SALES_SHIPMENT', 'INTERNAL_CONSUMPTION', 'SCRAPPING',
      'BIN_TRANSFER', 'INTER_ORG_TRANSFER', 'MISC_RECEIPT', 'MISC_ISSUE',
      'RETURN_FROM_CUSTOMER', 'RETURN_TO_SUPPLIER',
      'CYCLE_COUNT_PLANNED', 'CYCLE_COUNT_EXECUTED', 'PI_POSTING',
      'RESERVE_STOCK', 'ALLOCATE_ORDER', 'RELEASE_RESERVATION'
    ],
    default: ''
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
  serialNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unitOfMeasure: {
    type: String,
    default: 'EA',
    uppercase: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  referenceType: {
    type: String,
    enum: ['PO', 'SO', 'TRANSFER', 'ADJUSTMENT', 'CYCLE_COUNT', 'PI', 'RETURN', 'PRODUCTION', null],
    default: null
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  referenceNumber: {
    type: String,
    default: ''
  },
  reasonCode: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['Draft', 'Posted', 'Reversed'],
    default: 'Posted'
  },
  postedAt: {
    type: Date,
    default: Date.now
  },
  reversedAt: {
    type: Date,
    default: null
  },
  reversingTransactionId: {
    type: String,
    default: '',
    uppercase: true
  }
}, { timestamps: true });

stockTransactionSchema.index({ transactionId: 1 });
stockTransactionSchema.index({ item: 1, warehouse: 1, createdAt: -1 });
stockTransactionSchema.index({ referenceType: 1, referenceId: 1 });
stockTransactionSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
