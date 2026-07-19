const Offer = require('../models/Offer');
const OfferHistory = require('../models/OfferHistory');

// Build an absolute URL for the public payment page from the incoming request.
const buildPaymentLink = (req, token) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/pay/${token}`;
};

// @desc    Get public offer details for the payment page (by payment token)
// @route   GET /api/public/pay/:token
// @access  Public
exports.getPublicOfferByToken = async (req, res) => {
  try {
    const offer = await Offer.findOne({ paymentToken: req.params.token })
      .populate('lead', 'name email phone')
      .populate('createdBy', 'firstName lastName');

    if (!offer) {
      return res.status(404).json({ message: 'Payment link is invalid.' });
    }

    if (offer.status === 'Paid') {
      return res.json({
        success: true,
        alreadyPaid: true,
        data: {
          title: offer.title,
          price: offer.price,
          validUntil: offer.validUntil,
          bookingRef: offer.bookingRef,
          leadName: offer.lead ? offer.lead.name : ''
        }
      });
    }

    if (offer.status === 'Expired' || offer.status === 'Canceled') {
      return res.status(410).json({ message: `This offer is ${offer.status.toLowerCase()} and can no longer be paid.` });
    }

    // Agent cannot charge the user after the offer expiry date.
    if (new Date(offer.validUntil) < new Date()) {
      offer.status = 'Expired';
      await offer.save();
      return res.status(410).json({ message: 'This offer has expired and can no longer be paid.' });
    }

    res.json({
      success: true,
      data: {
        _id: offer._id,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        validUntil: offer.validUntil,
        leadName: offer.lead ? offer.lead.name : '',
        agentName: offer.createdBy ? `${offer.createdBy.firstName} ${offer.createdBy.lastName}` : ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Process a payment for an offer via its public payment link
// @route   POST /api/public/pay/:token
// @access  Public
exports.processPublicPayment = async (req, res) => {
  try {
    const { method } = req.body;
    if (!method) return res.status(400).json({ message: 'Payment method is required.' });

    const offer = await Offer.findOne({ paymentToken: req.params.token }).populate('lead', 'name email');
    if (!offer) return res.status(404).json({ message: 'Payment link is invalid.' });

    if (offer.status === 'Paid') {
      return res.status(409).json({ message: 'This offer has already been paid.', data: { bookingRef: offer.bookingRef } });
    }

    if (offer.status === 'Expired' || offer.status === 'Canceled') {
      return res.status(410).json({ message: `This offer is ${offer.status.toLowerCase()} and can no longer be paid.` });
    }

    // Hard guard: agent cannot charge the user after the offer expiry date.
    if (new Date(offer.validUntil) < new Date()) {
      offer.status = 'Expired';
      await offer.save();
      return res.status(410).json({ message: 'This offer has expired and can no longer be paid.' });
    }

    const note = `Payment received via ${method}. Booking Reference: ${offer.bookingRef || offer.recordLocator}.`;
    offer.notes = offer.notes ? `${offer.notes}\n${note}` : note;
    offer.status = 'Paid';
    offer.paymentMethod = method;
    offer.paidAt = new Date();
    await offer.save();

    await OfferHistory.create({
      offerId: offer._id,
      action: 'paid',
      performedBy: offer.createdBy,
      details: `Payment of $${Number(offer.price).toLocaleString()} received via ${method}. Booking Ref: ${offer.bookingRef}`,
      version: offer.version,
      metadata: { method, bookingRef: offer.bookingRef, amount: offer.price }
    });

    res.json({
      success: true,
      message: 'Payment successful. Booking created.',
      data: {
        bookingRef: offer.bookingRef,
        amount: offer.price,
        method,
        paidAt: offer.paidAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment failed', error: error.message });
  }
};
