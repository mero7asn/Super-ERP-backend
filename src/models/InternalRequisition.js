const mongoose = require('mongoose');

const internalRequisitionSchema = new mongoose.Schema({
  requisitionNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    default: 'General'
  },
  branch: {
    type: String,
    default: 'Cairo Branch'
  },
  targetWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  purpose: {
    type: String,
    default: ''
  },
  urgency: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Critical'],
    default: 'Normal'
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Partially Issued', 'Fulfilled', 'Rejected', 'Cancelled'],
    default: 'Draft'
  },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    issuedQty: { type: Number, default: 0 },
    uom: { type: String, default: 'EA' },
    remarks: { type: String, default: '' }
  }],
  totalEstimatedCost: {
    type: Number,
    default: 0
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

internalRequisitionSchema.index({ requisitionNumber: 1 });
internalRequisitionSchema.index({ requester: 1, status: 1 });

module.exports = mongoose.model('InternalRequisition', internalRequisitionSchema);
