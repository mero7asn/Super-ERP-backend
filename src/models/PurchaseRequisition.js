const mongoose = require('mongoose');

const purchaseRequisitionSchema = new mongoose.Schema({
  prNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    default: 'Operations'
  },
  branch: {
    type: String,
    default: 'Cairo Branch'
  },
  sourceType: {
    type: String,
    enum: ['Manual Request', 'Inventory Reorder', 'Demand Forecast', 'Sales Order', 'Maintenance Plan', 'MRP'],
    default: 'Manual Request'
  },
  sourceId: {
    type: String,
    default: ''
  },
  urgency: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Critical'],
    default: 'Normal'
  },
  requiredDate: {
    type: Date,
    required: true
  },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    estimatedUnitPrice: { type: Number, default: 0 },
    uom: { type: String, default: 'EA' },
    notes: { type: String, default: '' }
  }],
  totalEstimatedCost: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Pending Approval', 'Approved', 'RFQ Issued', 'PO Issued', 'Rejected', 'Cancelled'],
    default: 'Draft'
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
  rejectionReason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

purchaseRequisitionSchema.index({ prNumber: 1, status: 1 });

module.exports = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);
