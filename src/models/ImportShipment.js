const mongoose = require('mongoose');

const importShipmentSchema = new mongoose.Schema({
  shipmentNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  aciNumber: { // Advanced Cargo Information number (Egypt Customs)
    type: String,
    required: true,
    trim: true
  },
  acidNumber: { // ACID verification identifier
    type: String,
    default: '',
    trim: true
  },
  nafezaReference: { // Nafeza Egyptian Customs Portal ID
    type: String,
    default: '',
    trim: true
  },
  foreignExporterRegNumber: {
    type: String,
    default: '',
    trim: true
  },
  countryOfOrigin: {
    type: String,
    required: true,
    default: 'China'
  },
  portOfLoading: {
    type: String,
    default: 'Shanghai'
  },
  portOfDischarge: {
    type: String,
    default: 'Alexandria'
  },
  shippingLine: {
    type: String,
    default: 'Maersk Line'
  },
  containerNumber: {
    type: String,
    default: ''
  },
  containerType: {
    type: String,
    enum: ['20FT Standard', '40FT High Cube', 'Reefer', 'LCL'],
    default: '40FT High Cube'
  },
  billOfLading: {
    type: String,
    default: ''
  },
  customsBroker: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  hsCode: {
    type: String,
    default: ''
  },
  customsDeclarationNumber: {
    type: String,
    default: ''
  },
  etd: { type: Date, default: null }, // Estimated Time of Departure
  eta: { type: Date, default: null }, // Estimated Time of Arrival
  status: {
    type: String,
    enum: [
      'Draft', 'ACI Registered', 'ACID Verified', 'Departed',
      'In Transit', 'Arrived at Port', 'Customs Inspection',
      'Customs Cleared', 'Delivered to Warehouse', 'Cancelled'
    ],
    default: 'ACI Registered'
  },
  landedCostBreakdown: {
    goodsPurchaseUsd: { type: Number, default: 0 },
    exchangeRateUsdEgp: { type: Number, default: 48.5 },
    freightCostEgp: { type: Number, default: 0 },
    insuranceCostEgp: { type: Number, default: 0 },
    customsDutiesEgp: { type: Number, default: 0 },
    portHandlingFeesEgp: { type: Number, default: 0 },
    inlandTransportEgp: { type: Number, default: 0 },
    totalLandedCostEgp: { type: Number, default: 0 }
  }
}, { timestamps: true });

importShipmentSchema.index({ shipmentNumber: 1, aciNumber: 1, acidNumber: 1 });

module.exports = mongoose.model('ImportShipment', importShipmentSchema);
