const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String, default: null },
  status: {
    type: String,
    enum: ['Confirmed', 'Canceled', 'Refunded'],
    default: 'Confirmed'
  },
  // Public booking reference shown to the customer and used in the lookup tool.
  bookingRef: { type: String, unique: true, sparse: true },
  // Internal record locator (same value as bookingRef here, kept for consistency).
  recordLocator: { type: String, unique: true, sparse: true },
  paidAt: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
}, { timestamps: true });

bookingSchema.pre('save', async function () {
  if (!this.bookingRef) {
    let ref;
    let exists = true;
    while (exists) {
      ref = 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      exists = await mongoose.models.Booking.exists({ bookingRef: ref });
    }
    this.bookingRef = ref;
    this.recordLocator = ref;
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
