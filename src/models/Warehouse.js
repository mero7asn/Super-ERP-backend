const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['Main Warehouse', 'Returns Warehouse', 'Transit Warehouse', 'Quarantine', 'Production'],
    default: 'Main Warehouse'
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    manager: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance'],
    default: 'Active'
  },
  subinventories: [{
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Receiving', 'Shipping', 'Raw Materials', 'Finished Goods', 'Quarantine', 'Returns', 'General'],
      default: 'General'
    },
    locators: [{
      code: { type: String, required: true, uppercase: true },
      name: { type: String, default: '' },
      aisle: { type: String, default: '' },
      rack: { type: String, default: '' },
      bin: { type: String, default: '' },
      capacity: { type: Number, default: 0 },
      currentOccupancy: { type: Number, default: 0 },
      zone: { type: String, default: '' }
    }]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

warehouseSchema.index({ code: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
