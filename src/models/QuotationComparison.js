const mongoose = require('mongoose');

const quotationComparisonSchema = new mongoose.Schema({
  comparisonNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  rfq: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true
  },
  quotations: [{
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierQuotation', required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    grandTotalEgp: { type: Number, required: true },
    leadTimeDays: { type: Number, required: true },
    priceScore: { type: Number, default: 0 },
    leadTimeScore: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    totalCompositeScore: { type: Number, default: 0 } // 0 - 100%
  }],
  recommendedSupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  selectedSupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  overrideReason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Draft', 'Finalized', 'Awarded'],
    default: 'Draft'
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

quotationComparisonSchema.index({ comparisonNumber: 1, rfq: 1 });

module.exports = mongoose.model('QuotationComparison', quotationComparisonSchema);
