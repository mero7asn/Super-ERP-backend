const mongoose = require('mongoose');

const inventoryAdjustmentSchema = new mongoose.Schema({
  adjustmentId: {
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
  serialNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  systemQuantity: {
    type: Number,
    required: true
  },
  countedQuantity: {
    type: Number,
    required: true
  },
  varianceQuantity: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  varianceValue: {
    type: Number,
    required: true
  },
  reasonCode: {
    type: String,
    required: true,
    enum: [
      'DAMAGE', 'THEFT', 'OBSOLETE', 'DATA_ENTRY_ERROR',
      'OVERAGE', 'SHORTAGE', 'PRODUCTION_YIELD', 'QA_HOLD',
      'RETURN_TO_STOCK', 'SCRAP', 'OTHER'
    ]
  },
  reasonDescription: {
    type: String,
    default: ''
  },
  glAccount: {
    type: String,
    default: ''
  },
  costCenter: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Posted', 'Rejected'],
    default: 'Pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  stockTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

inventoryAdjustmentSchema.index({ adjustmentId: 1 });
inventoryAdjustmentSchema.index({ item: 1, warehouse: 1, status: 1 });

module.exports = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);
