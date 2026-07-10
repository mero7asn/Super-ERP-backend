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
  }
}, { timestamps: true });

module.exports = mongoose.model('Email', emailSchema);
