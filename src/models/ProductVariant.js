const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  supplierSku: {
    type: String,
    default: '',
    trim: true
  },
  barcode: {
    type: String,
    default: '',
    trim: true
  },
  barcodeType: {
    type: String,
    enum: ['EAN', 'UPC', 'Code 128', 'QR Code', 'GS1', 'Internal'],
    default: 'Code 128'
  },
  attributes: [{
    name: { type: String, required: true }, // e.g. Color, Size, Material
    value: { type: String, required: true } // e.g. Black, XL, Cotton
  }],
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  stockOnHand: {
    type: Number,
    default: 0
  },
  stockReserved: {
    type: Number,
    default: 0
  },
  reorderPoint: {
    type: Number,
    default: 0
  },
  weightKg: {
    type: Number,
    default: 0
  },
  dimensionsCm: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['Active', 'Discontinued', 'Draft'],
    default: 'Active'
  }
}, { timestamps: true });

productVariantSchema.index({ product: 1, sku: 1 });
productVariantSchema.index({ barcode: 1 });

module.exports = mongoose.model('ProductVariant', productVariantSchema);
