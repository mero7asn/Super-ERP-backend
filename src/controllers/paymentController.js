const Offer = require('../models/Offer');
const OfferHistory = require('../models/OfferHistory');
const Booking = require('../models/Booking');
const Lead = require('../models/Lead');
const SystemSetting = require('../models/SystemSetting');
const { sendRawEmail } = require('../services/emailService');
const { syncOfferToInventory } = require('../services/offerOrderService');

// Build an absolute URL for the public payment page on the FRONTEND app.
// The payment page lives on the client (Vercel frontend), not the API, so we
// must use the client origin — not the API host — when generating the link.
const CLIENT_URL = process.env.CLIENT_URL || 'https://super-erp-frontend.vercel.app';

const buildPaymentLink = (token) => `${CLIENT_URL}/pay/${token}`;

// Exported so other controllers (e.g. offerController) can build the public
// payment link without duplicating the CLIENT_URL logic.
module.exports.buildPaymentLink = buildPaymentLink;

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

    const brandingSetting = await SystemSetting.findOne({ key: 'branding' });
    const branding = brandingSetting?.value || { companyName: 'Super CRM', companyLogo: '' };

    res.json({
      success: true,
      data: {
        _id: offer._id,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        validUntil: offer.validUntil,
        leadName: offer.lead ? offer.lead.name : '',
        agentName: offer.createdBy ? `${offer.createdBy.firstName} ${offer.createdBy.lastName}` : '',
        companyName: branding.companyName || 'Super CRM',
        companyLogo: branding.companyLogo || ''
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

    // Create a Booking / Order record for the confirmed purchase.
    let booking = await Booking.findOne({ offer: offer._id });
    if (!booking) {
      booking = await Booking.create({
        offer: offer._id,
        lead: offer.lead,
        agent: offer.createdBy,
        title: offer.title,
        description: offer.description || '',
        amount: offer.price,
        paymentMethod: method,
        paidAt: offer.paidAt,
        status: 'Confirmed'
      });
    }

    // Keep the offer's bookingRef / recordLocator in sync with the booking.
    offer.bookingRef = booking.bookingRef;
    offer.recordLocator = booking.recordLocator;
    await offer.save();

    let inventorySync = null;
    try {
      inventorySync = await syncOfferToInventory({ offer, booking, performedBy: offer.createdBy });
    } catch (inventoryErr) {
      console.error('Failed to sync paid offer to inventory:', inventoryErr.message);
    }

    // Auto-convert the Lead to 'Converted' now that payment is confirmed.
    try {
      await Lead.findByIdAndUpdate(offer.lead, { status: 'Converted' });
    } catch (leadErr) {
      console.error('Failed to auto-convert lead status:', leadErr.message);
    }

    await OfferHistory.create({
      offerId: offer._id,
      action: 'paid',
      performedBy: offer.createdBy,
      details: `Payment of $${Number(offer.price).toLocaleString()} received via ${method}. Booking Ref: ${booking.bookingRef}`,
      version: offer.version,
      metadata: {
        method,
        bookingRef: booking.bookingRef,
        amount: offer.price,
        offerType: offer.offerType || 'Service',
        inventorySynced: !!inventorySync?.synced,
        inventoryTransactionId: inventorySync?.transactionId || null
      }
    });

    // Send a confirmation email to the customer (public/unauthenticated send).
    try {
      const lead = await Lead.findById(offer.lead);
      if (lead && lead.email) {
        const brandingSetting = await SystemSetting.findOne({ key: 'branding' });
        const branding = brandingSetting?.value || { companyName: 'Super CRM', companyLogo: '' };
        const payLink = buildPaymentLink(offer.paymentToken);
        const subject = `${branding.companyName || 'Super CRM'} — Payment Confirmed`;
        const text = `
Hello ${lead.name},

Thank you for your payment. Your booking is now confirmed.

Booking Reference: ${booking.bookingRef}
Amount Paid: $${Number(offer.price).toLocaleString()}
Payment Method: ${method}
${offer.validUntil ? `Valid Until: ${new Date(offer.validUntil).toLocaleDateString()}` : ''}

You can view or revisit your offer anytime here:
${payLink}

Best regards,
${branding.companyName || 'Super CRM'}
        `.trim();

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f4;">
    <tr><td align="center" style="padding:24px 0;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background-color:#16a34a;padding:24px 32px;color:#ffffff;">
          <h1 style="margin:0;font-size:20px;font-weight:600;">Payment Confirmed 🎉</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">Hello ${lead.name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">Thank you for your payment. Your booking is now confirmed.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:6px;margin:16px 0;">
            <tr><td style="padding:16px 24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Booking Reference</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a;">${booking.bookingRef}</p>
              <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Amount Paid <strong style="color:#334155;">$${Number(offer.price).toLocaleString()}</strong> via ${method}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:14px;color:#333333;line-height:1.6;">Best regards,<br><strong>${branding.companyName || 'Super CRM'}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `.trim();

        await sendRawEmail({ to: lead.email, subject, text, html, fromName: branding.companyName });
      }
    } catch (emailErr) {
      // Do not fail the payment if the confirmation email fails.
      console.error('Failed to send payment confirmation email:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Payment successful. Booking created.',
      data: {
        bookingRef: booking.bookingRef,
        amount: offer.price,
        method,
        paidAt: offer.paidAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment failed', error: error.message });
  }
};
