const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  rfqNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  purchaseRequisition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseRequisition',
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  deadlineDate: {
    type: Date,
    required: true
  },
  invitedSuppliers: [{
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    status: { type: String, enum: ['Invited', 'Viewed', 'Submitted', 'Declined'], default: 'Invited' },
    sentAt: { type: Date, default: Date.now }
  }],
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true },
    uom: { type: String, default: 'EA' },
    requiredDate: { type: Date, required: true },
    targetUnitPrice: { type: Number, default: 0 }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Quotations Received', 'Under Evaluation', 'Closed', 'Awarded', 'Cancelled'],
    default: 'Draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

rfqSchema.index({ rfqNumber: 1, status: 1 });

module.exports = mongoose.model('RFQ', rfqSchema);
