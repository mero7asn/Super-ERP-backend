const mongoose = require('mongoose');

const stockLevelSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  subinventory: {
    type: String,
    required: true,
    uppercase: true
  },
  locator: {
    type: String,
    default: '',
    uppercase: true
  },
  lotNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  serialNumber: {
    type: String,
    default: '',
    uppercase: true
  },
  onHand: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  available: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  allocated: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reserved: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  blocked: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  inTransit: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastTransactionDate: {
    type: Date,
    default: null
  },
  lastCountedDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

stockLevelSchema.index({ item: 1, warehouse: 1, subinventory: 1, locator: 1, lotNumber: 1, serialNumber: 1 }, { unique: true });

module.exports = mongoose.model('StockLevel', stockLevelSchema);
