const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  nameAr: {
    type: String,
    default: '',
    trim: true,
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  supplierSku: {
    type: String,
    default: '',
    trim: true,
  },
  barcode: {
    type: String,
    default: '',
    trim: true,
  },
  barcodeType: {
    type: String,
    enum: ['EAN', 'UPC', 'Code 128', 'QR Code', 'GS1', 'Internal'],
    default: 'Code 128',
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  brand: {
    type: String,
    default: 'Generic',
  },
  category: {
    type: String,
    default: 'General',
  },
  subcategory: {
    type: String,
    default: '',
  },
  productType: {
    type: String,
    enum: [
      'Stock Item', 'Non-Stock Item', 'Service', 'Raw Material',
      'Finished Product', 'Semi-Finished Product', 'Spare Part',
      'Consumable', 'Packaging Material', 'Asset', 'Kit', 'Bundle'
    ],
    default: 'Stock Item',
  },
  description: {
    type: String,
    default: '',
  },
  descriptionAr: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  vatRate: {
    type: Number,
    default: 14.0, // Standard Egyptian VAT %
  },
  taxCategory: {
    type: String,
    enum: ['Standard VAT', 'Zero Rated', 'Exempt', 'Special Duty'],
    default: 'Standard VAT',
  },
  hsCode: {
    type: String,
    default: '',
  },
  hasVariants: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Discontinued'],
    default: 'Active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

productSchema.index({ name: 'text', nameAr: 'text', sku: 'text', barcode: 'text' });

module.exports = mongoose.model('Product', productSchema);
