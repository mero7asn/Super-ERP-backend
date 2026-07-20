const Offer = require('../models/Offer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { buildPaymentLink } = require('./paymentController');
const { getGlobalEmailConfig, sendRawEmail } = require('../services/emailService');

// @desc    Get offers for a lead
// @route   GET /api/offers/lead/:leadId
// @access  Private
exports.getOffersByLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isManager = req.user.role === 'Sales Manager';
    const isAgent = req.user.role === 'Sales Agent';

    // Check permissions
    if (isAgent && lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view offers for this lead' });
    }

    if (isManager) {
      const teamAgents = await User.find({ supervisor: req.user._id, role: 'Sales Agent' }).select('_id');
      const agentIds = teamAgents.map(a => a._id.toString());
      if (!agentIds.includes(lead.assignedTo?.toString())) {
        return res.status(403).json({ message: 'This lead does not belong to your team' });
      }
    }

    const offers = await Offer.find({ lead: req.params.leadId })
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create an offer
// @route   POST /api/offers
// @access  Private (Sales Agent, Manager, Admin)
exports.createOffer = async (req, res) => {
  try {
    const body = req.body || {};
    console.log('[createOffer] request body:', JSON.stringify(body));

    const { lead, title, description, price, validUntil, notes, offerType, catalogProduct } = body;

    if (!lead || String(lead).trim() === '') {
      return res.status(400).json({ message: 'Lead is required' });
    }

    let leadDoc;
    try {
      leadDoc = await Lead.findById(lead);
    } catch (e) {
      console.error('[createOffer] invalid lead id:', lead, e.message);
      return res.status(400).json({ message: 'Invalid lead selected' });
    }
    if (!leadDoc) return res.status(404).json({ message: 'Lead not found' });

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Offer title is required' });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: 'Offer description is required' });
    }

    const numPrice = Number(price);
    if (price === undefined || price === null || price === '' || Number.isNaN(numPrice)) {
      return res.status(400).json({ message: 'Price is required and must be a valid number' });
    }

    if (numPrice < 0) {
      return res.status(400).json({ message: 'Price cannot be negative' });
    }

    if (!validUntil || String(validUntil).trim() === '') {
      return res.status(400).json({ message: 'Valid until date is required' });
    }

    const parsedValidUntil = new Date(validUntil);
    if (Number.isNaN(parsedValidUntil.getTime())) {
      return res.status(400).json({ message: 'Valid until must be a valid date' });
    }

    let parsedCatalogProduct = null;
    if (catalogProduct && String(catalogProduct).trim() !== '') {
      try {
        parsedCatalogProduct = require('mongoose').Types.ObjectId(String(catalogProduct).trim());
      } catch {
        return res.status(400).json({ message: 'Invalid catalog product selected' });
      }
    }

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isManager = req.user.role === 'Sales Manager';
    const isAgent = req.user.role === 'Sales Agent';

    if (isAgent && leadDoc.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create offers for this lead' });
    }

    if (isManager) {
      const teamAgents = await User.find({ supervisor: req.user._id, role: 'Sales Agent' }).select('_id');
      const agentIds = teamAgents.map(a => a._id.toString());
      if (!agentIds.includes(leadDoc.assignedTo?.toString())) {
        return res.status(403).json({ message: 'This lead does not belong to your team' });
      }
    }

    let offer;
    const leadId = leadDoc._id;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const catalogProductId = parsedCatalogProduct;
    const baseOffer = {
      lead: leadId,
      createdBy: userId,
      title: String(title).trim(),
      description: String(description).trim(),
      price: numPrice,
      validUntil: parsedValidUntil,
      offerType: offerType || 'Service',
      catalogProduct: catalogProductId,
      notes: notes ? String(notes).trim() : ''
    };

    // Some deployed DBs incorrectly have non-sparse unique indexes on nullable
    // fields. Create offers without generating payment / booking references
    // so record locators are only created when required by payment/acceptance.
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
          const candidate = { ...baseOffer };
          // Use raw collection insert to avoid triggering Mongoose pre-save hooks
          // that may behave differently in serverless deployments and cause
          // unexpected transformations.
          const now = new Date();
          const insertDoc = { ...candidate, createdAt: now, updatedAt: now };
          delete insertDoc.recordLocator;
          delete insertDoc.bookingRef;
          delete insertDoc.paymentToken;
          const res = await Offer.collection.insertOne(insertDoc);
          offer = await Offer.findById(res.insertedId);
        break;
      } catch (err) {
        if (err && err.code === 11000) {
          console.warn('[createOffer] duplicate-key on insert, retrying', { attempt, err: err.message });
          continue;
        }
        throw err;
      }
    }
    if (!offer) {
      throw new Error('Failed to create offer after multiple attempts due to duplicate-key conflicts');
    }

    const populated = await offer.populate('createdBy', 'firstName lastName role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    const debugId = (req && req.requestId) || crypto.randomBytes(6).toString('hex');
    console.error(`[createOffer] unexpected error (id=${debugId}):`, error && error.message);
    console.error(error && error.stack);
    const message = error.message || 'Failed to create offer';
    res.status(500).json({ message: 'Failed to create offer', error: message, debugId });
  }
};

// @desc    Update an offer
// @route   PUT /api/offers/:id
// @access  Private
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to update this offer' });
    }

    // Don't allow editing sent offers (except status)
    if (offer.status !== 'Draft' && !isAdmin) {
      const allowedUpdates = { status: req.body.status, notes: req.body.notes };
      Object.keys(allowedUpdates).forEach(k => allowedUpdates[k] === undefined && delete allowedUpdates[k]);
      const updated = await Offer.findByIdAndUpdate(req.params.id, allowedUpdates, { new: true, runValidators: true })
        .populate('createdBy', 'firstName lastName role');
      return res.json({ success: true, data: updated });
    }

    const updated = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('createdBy', 'firstName lastName role');
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete an offer
// @route   DELETE /api/offers/:id
// @access  Private
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this offer' });
    }

    await Offer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Send offer via email/SMS
// @route   POST /api/offers/:id/send
// @access  Private
exports.sendOffer = async (req, res) => {
  try {
    const { method } = req.body; // 'Email', 'SMS', or 'Both'

    const offer = await Offer.findById(req.params.id).populate('lead').populate('createdBy', 'firstName lastName');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to send this offer' });
    }

    // Ensure the offer has a payment token so a public payment link can be
    // shared with the customer. Generated once and reused for all resends.
    if (!offer.paymentToken) {
      let token;
      let exists = true;
      while (exists) {
        token = crypto.randomBytes(16).toString('hex');
        exists = await Offer.exists({ paymentToken: token });
      }
      offer.paymentToken = token;
    }

    const payLink = buildPaymentLink(offer.paymentToken);

    if (!['Email', 'SMS', 'Both'].includes(method)) {
      return res.status(400).json({ message: 'Send method must be Email, SMS or Both' });
    }

    // Build message content
    const emailSubject = `New Offer: ${offer.title}`;
    const emailBody = `
Hello ${offer.lead.name},

We have a special offer for you!

${offer.title}
${offer.description}

Price: $${offer.price.toLocaleString()}
Valid Until: ${new Date(offer.validUntil).toLocaleDateString()}

Complete your payment here:
${payLink}

Best regards,
${offer.createdBy.firstName} ${offer.createdBy.lastName}
    `.trim();

    const smsMessage = `${offer.title} - $${offer.price}. Valid until ${new Date(offer.validUntil).toLocaleDateString()}. Pay here: ${payLink}`;

    let emailSent = true;
    let smsSent = true;
    let sendError = null;

    if (method === 'Email' || method === 'Both') {
      const brandingSetting = await SystemSetting.findOne({ key: 'branding' });
      const branding = brandingSetting?.value || { companyName: 'Super CRM', companyLogo: '' };
      const brandedSubject = `${branding.companyName || 'Super CRM'} — ${emailSubject}`;
      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f4;">
    <tr><td align="center" style="padding:24px 0;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background-color:#111827;padding:24px 32px;color:#ffffff;display:flex;align-items:center;gap:12px;">
          ${branding.companyLogo ? `<img src="${branding.companyLogo}" alt="${branding.companyName}" width="48" height="48" style="object-fit:contain;border-radius:8px;" />` : ''}
          <div>
            <h1 style="margin:0;font-size:20px;font-weight:600;">${branding.companyName || 'Super CRM'}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Offer from ${branding.companyName || 'Super CRM'}</p>
          </div>
        </td></tr>
        <tr><td style="padding:32px;color:#111827;">
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hello ${offer.lead.name},</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">We have shared a new offer with you from ${branding.companyName || 'Super CRM'}.</p>
          <h2 style="margin:0 0 12px;font-size:18px;">${offer.title}</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${offer.description}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Price:</strong> $${offer.price.toLocaleString()}</p>
          <p style="margin:0 0 24px;font-size:14px;"><strong>Valid Until:</strong> ${new Date(offer.validUntil).toLocaleDateString()}</p>
          <a href="${payLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;">Pay Now — $${offer.price.toLocaleString()}</a>
          <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">If you have any questions, reply to this email.</p>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.6;">Best regards,<br />${offer.createdBy.firstName} ${offer.createdBy.lastName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `.trim();
      try {
        const globalCfg = await getGlobalEmailConfig();
        await sendRawEmail({
          to: offer.lead.email,
          subject: brandedSubject,
          text: `${emailBody}\n\nSent by ${branding.companyName || 'Super CRM'}`,
          html: emailHtml,
          fromName: branding.companyName || 'Super CRM'
        });
      } catch (err) {
        emailSent = false;
        sendError = err;
      }
    }
    if (method === 'SMS' || method === 'Both') {
      if (!offer.lead.phone) {
        smsSent = false;
        sendError = new Error('Lead phone number is required for SMS');
      } else {
        smsSent = false;
        sendError = new Error('SMS sending is not configured. Please use Email only or integrate an SMS provider.');
      }
    }

    if ((method === 'Email' || method === 'Both') && !emailSent) {
      return res.status(500).json({ message: 'Failed to send offer by email', error: sendError?.message || 'Email send failed' });
    }
    if ((method === 'SMS' || method === 'Both') && !smsSent) {
      return res.status(500).json({ message: 'Failed to send offer by SMS', error: sendError?.message || 'SMS send failed' });
    }

    // Update offer status
    offer.status = 'Sent';
    offer.sentAt = new Date();
    offer.sentVia = method;
    await offer.save();

    res.json({ success: true, message: `Offer sent via ${method}`, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send offer', error: error.message });
  }
};

const OfferTemplate = require('../models/OfferTemplate');

// @desc    Get all offer templates (user's own + public)
// @route   GET /api/offers/templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const templates = await OfferTemplate.find({
      $or: [
        { createdBy: req.user._id },
        { isPublic: true }
      ]
    }).populate('createdBy', 'firstName lastName').sort({ createdAt: -1 });

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create an offer template
// @route   POST /api/offers/templates
// @access  Private
exports.createTemplate = async (req, res) => {
  try {
    const { name, title, description, price, validDays, isPublic } = req.body;

    const template = await OfferTemplate.create({
      name,
      title,
      description,
      price: price || 0,
      validDays: validDays || 30,
      createdBy: req.user._id,
      isPublic: isPublic || false
    });

    const populated = await template.populate('createdBy', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Template name already exists' });
    } else {
      res.status(400).json({ message: 'Failed to create template', error: error.message });
    }
  }
};

// @desc    Update an offer template
// @route   PUT /api/offers/templates/:id
// @access  Private
exports.updateTemplate = async (req, res) => {
  try {
    const template = await OfferTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    if (!isAdmin && template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this template' });
    }

    const { name, title, description, price, validDays, isPublic } = req.body;
    if (name !== undefined) template.name = name;
    if (title !== undefined) template.title = title;
    if (description !== undefined) template.description = description;
    if (price !== undefined) template.price = price;
    if (validDays !== undefined) template.validDays = validDays;
    if (isPublic !== undefined) template.isPublic = isPublic;

    const updated = await template.save();
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Template name already exists' });
    } else {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  }
};

// @desc    Delete an offer template
// @route   DELETE /api/offers/templates/:id
// @access  Private
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await OfferTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    if (!isAdmin && template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this template' });
    }

    await OfferTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Upload image for an offer
// @route   POST /api/offers/:id/images
// @access  Private
exports.uploadOfferImage = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to upload images for this offer' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `/uploads/offers/${req.file.filename}`;
    offer.images.push({ url: imageUrl, caption: req.body.caption || '' });
    await offer.save();

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  }
};

// @desc    Delete an offer image
// @route   DELETE /api/offers/:id/images/:imageId
// @access  Private
exports.deleteOfferImage = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete images from this offer' });
    }

    offer.images = offer.images.filter(img => img._id.toString() !== req.params.imageId);
    await offer.save();

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
};

// @desc    Initiate Avaya call to lead
// @route   POST /api/offers/:id/call
// @access  Private
exports.initiateAvayaCall = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to call for this offer' });
    }

    const agent = await User.findById(req.user._id);
    if (!agent?.avayaExtension && !agent?.avayaConfig?.server) {
      return res.status(400).json({ message: 'Agent is not configured for Avaya calling. Contact Technology team.' });
    }

    if (!offer.lead?.phone) {
      return res.status(400).json({ message: 'Lead does not have a phone number configured' });
    }

    // TODO: Integrate with actual Avaya API
    // This would typically trigger a call through Avaya's telephony system
    console.log(`[Avaya Call] Agent: ${agent.avayaExtension}, Calling: ${offer.lead.phone}`);
    console.log(`[Avaya Call] Lead: ${offer.lead.name}, Offer: ${offer.title}`);

    res.json({
      success: true,
      message: `Call initiated to ${offer.lead.phone}`,
      data: { leadPhone: offer.lead.phone, agentExtension: agent.avayaExtension }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to initiate call', error: error.message });
  }
};

// @desc    Get offer by record locator (for booking lookup)
// @route   GET /api/offers/locator/:recordLocator
// @access  Private
exports.getOfferByLocator = async (req, res) => {
  try {
    const offer = await Offer.findOne({ recordLocator: req.params.recordLocator })
      .populate('lead', 'name email phone')
      .populate('createdBy', 'firstName lastName');

    if (!offer) {
      return res.status(404).json({ message: 'Booking not found with this record locator' });
    }

    // Allow access to ticket creator, assigned agent, or admins
    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isCreator = offer.createdBy._id.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
