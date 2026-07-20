const mongoose = require('mongoose');

const returnOrderSchema = new mongoose.Schema({
  returnId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  originalShipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    default: null
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  returnReason: {
    type: String,
    required: true,
    enum: ['DEFECTIVE', 'WRONG_ITEM', 'DAMAGED_IN_TRANSIT', 'CUSTOMER_CHANGED_MIND', 'EXCESS_INVENTORY', 'RECALL', 'OTHER']
  },
  returnReasonNotes: {
    type: String,
    default: ''
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Received', 'Inspection', 'Dispositioned', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  disposition: {
    type: String,
    enum: ['RESTOCK', 'QUARANTINE', 'SCRAP', 'RETURN_TO_VENDOR', 'REFURBISH'],
    default: 'QUARANTINE'
  },
  lines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
    uom: { type: String, default: 'EA', uppercase: true },
    lotNumber: { type: String, default: '', uppercase: true },
    serialNumbers: [{ type: String, uppercase: true }],
    condition: {
      type: String,
      enum: ['New', 'Used', 'Refurbished', 'Damaged', 'Scrap'],
      default: 'New'
    },
    qualityStatus: {
      type: String,
      enum: ['Pending', 'Passed', 'Failed', 'Quarantine'],
      default: 'Pending'
    },
    restockQty: { type: Number, default: 0, min: 0 },
    scrapQty: { type: Number, default: 0, min: 0 },
    quarantineQty: { type: Number, default: 0, min: 0 }
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
  dispositionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  returnReceiptTransactionId: {
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

returnOrderSchema.index({ returnId: 1 });
returnOrderSchema.index({ warehouse: 1, status: 1 });

module.exports = mongoose.model('ReturnOrder', returnOrderSchema);
