const mongoose = require('mongoose');

const offerHistorySchema = new mongoose.Schema({
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'completed', 'canceled', 'refunded', 'updated', 'resend', 'image_added', 'image_removed', 'revised', 'version_sent'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  details: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  version: {
    type: Number,
    default: null
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  versionRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfferVersion',
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('OfferHistory', offerHistorySchema);
