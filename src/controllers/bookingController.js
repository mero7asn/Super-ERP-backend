const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const Lead = require('../models/Lead');

// @desc    Get a booking by its reference (public-ish lookup used by the
//          booking lookup tool and confirmation screens)
// @route   GET /api/bookings/:ref
// @access  Private
exports.getBookingByRef = async (req, res) => {
  try {
    const ref = String(req.params.ref).toUpperCase();
    const booking = await Booking.findOne({
      $or: [{ bookingRef: ref }, { recordLocator: ref }]
    })
      .populate('offer', 'title description price validUntil status')
      .populate('lead', 'name email phone')
      .populate('agent', 'firstName lastName');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    List bookings (optionally filtered by lead or agent)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    const filter = {};
    if (req.query.lead) filter.lead = req.query.lead;
    if (req.query.agent) filter.agent = req.query.agent;

    const bookings = await Booking.find(filter)
      .populate('offer', 'title price status')
      .populate('lead', 'name email')
      .populate('agent', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Cancel / refund a booking (keeps the record, flips status)
// @route   PUT /api/bookings/:id
// @access  Private (Admin / agent who owns the offer)
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    if (!isAdmin && booking.agent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    if (req.body.status) booking.status = req.body.status;
    if (req.body.notes !== undefined) booking.notes = req.body.notes;
    await booking.save();

    // Cascade status changes: revert the linked Offer and Lead when booking is canceled/refunded
    if (req.body.status === 'Canceled' || req.body.status === 'Refunded') {
      const newOfferStatus = req.body.status === 'Refunded' ? 'Refunded' : 'Canceled';
      try {
        await Offer.findByIdAndUpdate(booking.offer, { status: newOfferStatus });
        // Revert lead from Converted back to Negotiation so it re-enters the pipeline
        await Lead.findByIdAndUpdate(booking.lead, { status: 'Negotiation' });
      } catch (cascadeErr) {
        console.error('Failed to cascade booking status to offer/lead:', cascadeErr.message);
      }
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
