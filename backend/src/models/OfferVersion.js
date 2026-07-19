const mongoose = require('mongoose');

const offerVersionSchema = new mongoose.Schema({
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true
  },
  offerType: {
    type: String,
    enum: ['Product', 'Service'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statusAtSnapshot: {
    type: String,
    required: true
  },
  changeSummary: {
    type: String,
    default: ''
  },
  emailRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    default: null
  },
  requirement: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

offerVersionSchema.index({ offerId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('OfferVersion', offerVersionSchema);
