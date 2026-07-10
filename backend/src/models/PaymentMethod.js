const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardholderName: { type: String, required: true },
  cardType: { type: String, enum: ['Visa', 'Mastercard', 'Other'], required: true },
  lastFour: { type: String, required: true },
  cardToken: { type: String, required: true }, // masked: ************1234
  cardLength: { type: Number, required: true }, // actual digit count for payroll verification
  expiryMonth: { type: String, required: true },
  expiryYear: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  isActive: { type: Boolean, default: false }, // only one active card per employee
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
