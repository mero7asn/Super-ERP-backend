const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  htmlBody: {
    type: String,
    default: null
  },
  fromEmail: {
    type: String,
    default: null
  },
  toEmail: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  // Thread support
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    default: null
  },
  isReply: {
    type: Boolean,
    default: false
  },
  // Read tracking
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  // External delivery status
  status: {
    type: String,
    enum: ['draft', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'sent'
  },
  messageId: {
    type: String,
    default: null
  },
  providerError: {
    type: String,
    default: null
  },
  // Offer link
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    default: null
  },
  offerVersion: {
    type: Number,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Email', emailSchema);
