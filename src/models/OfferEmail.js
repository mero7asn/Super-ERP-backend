const mongoose = require('mongoose');

const offerEmailSchema = new mongoose.Schema({
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    index: true,
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true,
  },
  direction: {
    type: String,
    enum: ['outbound', 'inbound'],
    default: 'outbound',
  },
  subject: {
    type: String,
    default: 'Offer communication',
  },
  body: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'received', 'replied', 'failed'],
    default: 'sent',
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  senderName: {
    type: String,
    default: '',
  },
  senderEmail: {
    type: String,
    default: '',
  },
  recipientEmail: {
    type: String,
    default: '',
  },
  recipientName: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model('OfferEmail', offerEmailSchema);
