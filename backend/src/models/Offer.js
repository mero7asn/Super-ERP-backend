const mongoose = require('mongoose');
const crypto = require('crypto');

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
    enum: ['Product', 'Service'],
    required: [true, 'Offer type is required'],
    default: 'Service'
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
    unique: true,
    sparse: true
  },
  bookingRef: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentToken: {
    type: String,
    unique: true,
    sparse: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    default: null
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
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  revisionNote: {
    type: String,
    default: ''
  }
}, { timestamps: true });

offerSchema.pre('save', async function() {
  if (this.isModified('status') && this.status === 'Accepted' && !this.recordLocator) {
    this.recordLocator = 'REC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  // Generate a secure payment token the first time an offer is saved.
  if (!this.paymentToken) {
    this.paymentToken = crypto.randomBytes(16).toString('hex');
  }

  // When an offer is marked Paid, create a booking reference and stamp paidAt.
  if (this.isModified('status') && this.status === 'Paid' && !this.bookingRef) {
    if (!this.recordLocator) {
      this.recordLocator = 'REC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    this.bookingRef = this.recordLocator;
    this.paidAt = this.paidAt || new Date();
  }
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
