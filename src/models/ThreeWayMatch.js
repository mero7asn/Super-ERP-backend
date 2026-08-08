const mongoose = require('mongoose');

const threeWayMatchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  receivingOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceivingOrder',
    required: true
  },
  supplierInvoiceNumber: {
    type: String,
    required: true,
    uppercase: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  poAmountEgp: {
    type: Number,
    required: true
  },
  receivingAmountEgp: {
    type: Number,
    required: true
  },
  invoiceAmountEgp: {
    type: Number,
    required: true
  },
  quantityVariance: {
    type: Number,
    default: 0
  },
  priceVariancePct: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Matched', 'Quantity Discrepancy Flagged', 'Price Variance Flagged', 'Resolved', 'Rejected'],
    default: 'Matched'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

threeWayMatchSchema.index({ matchId: 1, purchaseOrder: 1, supplierInvoiceNumber: 1 });

module.exports = mongoose.model('ThreeWayMatch', threeWayMatchSchema);
