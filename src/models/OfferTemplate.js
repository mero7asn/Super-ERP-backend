const mongoose = require('mongoose');

const offerTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Default title is required']
  },
  description: {
    type: String,
    required: [true, 'Default description is required']
  },
  price: {
    type: Number,
    default: 0
  },
  validDays: {
    type: Number,
    default: 30,
    min: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const OfferTemplate = mongoose.model('OfferTemplate', offerTemplateSchema);

module.exports = OfferTemplate;