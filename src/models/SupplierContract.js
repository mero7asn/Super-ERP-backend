const mongoose = require('mongoose');

const supplierContractSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  contractType: {
    type: String,
    enum: ['Framework Agreement', 'Blanket Purchase Agreement', 'Supplier Price List'],
    default: 'Framework Agreement'
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    supplierSku: { type: String, default: '' },
    agreedUnitPrice: { type: Number, required: true },
    moq: { type: Number, default: 1 }, // Minimum Order Quantity
    contractualLeadTimeDays: { type: Number, default: 7 }
  }],
  totalContractValue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Terminated', 'Draft'],
    default: 'Active'
  }
}, { timestamps: true });

supplierContractSchema.index({ contractNumber: 1, supplier: 1, status: 1 });

module.exports = mongoose.model('SupplierContract', supplierContractSchema);
