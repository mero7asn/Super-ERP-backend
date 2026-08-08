const mongoose = require('mongoose');

const uomConversionSchema = new mongoose.Schema({
  fromUom: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  toUom: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  conversionFactor: {
    type: Number,
    required: true,
    min: 0.0001
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null // null means global conversion (e.g. 1 Pallet = 40 Cartons)
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

uomConversionSchema.index({ fromUom: 1, toUom: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('UomConversion', uomConversionSchema);
