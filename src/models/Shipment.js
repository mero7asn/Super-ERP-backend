const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  orderReference: {
    type: String,
    default: '',
    uppercase: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerRef: {
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
    enum: ['Draft', 'Picking', 'Packed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Draft'
  },
  lines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
    uom: { type: String, default: 'EA', uppercase: true },
    lotNumber: { type: String, default: '', uppercase: true },
    serialNumbers: [{ type: String, uppercase: true }]
  }],
  totalPackages: {
    type: Number,
    default: 1,
    min: 1
  },
  totalWeight: {
    type: Number,
    default: 0
  },
  freightCharges: {
    type: Number,
    default: 0
  },
  packagingCharges: {
    type: Number,
    default: 0
  },
  carrier: {
    type: String,
    default: ''
  },
  trackingNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  shippingAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  shippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  shippedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  goodsIssueTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockTransaction',
    default: null
  },
  invoiceNumber: {
    type: String,
    default: '',
    uppercase: true
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

shipmentSchema.index({ shipmentId: 1 });
shipmentSchema.index({ orderReference: 1, status: 1 });
shipmentSchema.index({ warehouse: 1, status: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
