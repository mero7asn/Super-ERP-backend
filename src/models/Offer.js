const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Offer title is required']
  },
  description: {
    type: String,
    required: [true, 'Offer description is required']
  },
  offerType: {
    type: String,
    enum: ['Service', 'Product'],
    default: 'Service'
  },
  catalogProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Completed', 'Canceled', 'Refunded', 'Paid'],
    default: 'Draft'
  },
  recordLocator: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  sentAt: {
    type: Date,
    default: null
  },
  sentVia: {
    type: String,
    enum: ['Email', 'SMS', 'Both', null],
    default: null
  },
  viewedAt: {
    type: Date,
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  },
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    default: ''
  },

  // ── Payment / Booking fields ─────────────────────────────────────
  // Unique, non-guessable token used in the public payment link (/pay/:token).
  paymentToken: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  // Reference created once payment is confirmed (synced from the Booking).
  bookingRef: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['Card', 'BankTransfer', 'Fawry', 'PayMob', 'InstaPay', 'Cash', null],
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

offerSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'Accepted' && !this.recordLocator) {
    this.recordLocator = 'REC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
