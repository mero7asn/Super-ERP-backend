const Offer = require('../models/Offer');
const OfferHistory = require('../models/OfferHistory');
const OfferVersion = require('../models/OfferVersion');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Email = require('../models/Email');
const { sendEmail, getGlobalEmailConfig } = require('../services/emailService');
const { put } = require('@vercel/blob');
const { buildPaymentLink } = require('./paymentController');

const TRACKED_FIELDS = ['title', 'description', 'offerType', 'price', 'validUntil', 'notes'];

function computeDiff(oldDoc, newDoc) {
  const changes = {};
  for (const field of TRACKED_FIELDS) {
    const from = oldDoc[field];
    const to = newDoc[field];
    if (field === 'validUntil') {
      const fromStr = from ? new Date(from).toISOString() : null;
      const toStr = to ? new Date(to).toISOString() : null;
      if (fromStr !== toStr) changes[field] = { from: fromStr, to: toStr };
    } else if (String(from ?? '') !== String(to ?? '')) {
      changes[field] = { from: from ?? null, to: to ?? null };
    }
  }
  return changes;
}

function formatChangeSummary(changes) {
  if (!changes || Object.keys(changes).length === 0) return '';
  const parts = Object.keys(changes).map(field => {
    const { from, to } = changes[field];
    if (field === 'price') {
      return `Price ${from != null ? '$' + Number(from).toLocaleString() : '—'} → ${to != null ? '$' + Number(to).toLocaleString() : '—'}`;
    }
    if (field === 'validUntil') {
      const fmt = v => v ? new Date(v).toLocaleDateString() : '—';
      return `ValidUntil ${fmt(from)} → ${fmt(to)}`;
    }
    return `${field} changed`;
  });
  return parts.join('; ');
}

async function createVersionSnapshot(offer, { statusAtSnapshot, requirement, changeSummary, emailRef, createdBy }) {
  return OfferVersion.findOneAndUpdate(
    { offerId: offer._id, version: offer.version },
    {
      $set: {
        offerType: offer.offerType,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        validUntil: offer.validUntil,
        notes: offer.notes,
        images: offer.images || [],
        statusAtSnapshot: statusAtSnapshot || offer.status,
        changeSummary: changeSummary || '',
        requirement: requirement || '',
        emailRef: emailRef || null,
        createdBy: createdBy || offer.createdBy
      }
    },
    { new: true, upsert: true }
  );
}

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
    const { lead, title, description, price, validUntil, notes, offerType } = req.body;

    const leadDoc = await Lead.findById(lead);
    if (!leadDoc) return res.status(404).json({ message: 'Lead not found' });

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Offer title is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Offer description is required' });
    }

    if (price === undefined || price === null || price === '' || isNaN(Number(price))) {
      return res.status(400).json({ message: 'Price is required and must be a valid number' });
    }

    if (Number(price) < 0) {
      return res.status(400).json({ message: 'Price cannot be negative' });
    }

    if (!validUntil) {
      return res.status(400).json({ message: 'Valid until date is required' });
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

    const offer = await Offer.create({
      lead,
      createdBy: req.user._id,
      title,
      description,
      offerType: offerType || 'Service',
      price,
      validUntil,
      notes: notes || ''
    });

    await OfferHistory.create({
      offerId: offer._id,
      action: 'created',
      performedBy: req.user._id,
      details: `Offer created as ${offerType || 'Service'}`,
      metadata: { offerType: offerType || 'Service' }
    });

    const populated = await offer.populate('createdBy', 'firstName lastName role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Offer creation error:', error.message);
    res.status(400).json({ message: 'Failed to create offer', error: error.message });
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
    const canUpdateBookingStatus = ['Customer Support Agent', 'Customer Support Manager', 'CRM Developer', 'CRM Consultant'].includes(req.user.role);

    if (!isAdmin && !isOwner && !canUpdateBookingStatus) {
      return res.status(403).json({ message: 'Not authorized to update this offer' });
    }

    if (offer.status !== 'Draft') {
      if (!isAdmin && !isOwner && !canUpdateBookingStatus) {
        return res.status(403).json({
          message: 'This offer has already been sent. Use "Revise" to create a new editable version.'
        });
      }

      const allowedUpdates = canUpdateBookingStatus && !isAdmin
        ? { status: req.body.status }
        : { status: req.body.status, notes: req.body.notes };
      Object.keys(allowedUpdates).forEach(k => allowedUpdates[k] === undefined && delete allowedUpdates[k]);
      const oldStatus = offer.status;
      const updated = await Offer.findByIdAndUpdate(req.params.id, allowedUpdates, { new: true, runValidators: true })
        .populate('createdBy', 'firstName lastName role');

      if (req.body.status && req.body.status !== oldStatus) {
        await OfferHistory.create({
          offerId: offer._id,
          action: req.body.status.toLowerCase(),
          performedBy: req.user._id,
          details: `Status changed from ${oldStatus} to ${req.body.status}`,
          version: offer.version,
          metadata: { oldStatus, newStatus: req.body.status }
        });
      }

      return res.json({ success: true, data: updated });
    }

    const oldSnapshot = offer.toObject();
    const updated = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('createdBy', 'firstName lastName role');

    const changes = computeDiff(oldSnapshot, updated);
    const oldStatus = oldSnapshot.status;

    if (Object.keys(changes).length > 0) {
      await OfferHistory.create({
        offerId: offer._id,
        action: 'updated',
        performedBy: req.user._id,
        details: `Offer edited (v${updated.version}): ${formatChangeSummary(changes)}`,
        version: updated.version,
        changes,
        metadata: { version: updated.version }
      });
    }

    if (req.body.status && req.body.status !== oldStatus) {
      await OfferHistory.create({
        offerId: offer._id,
        action: req.body.status.toLowerCase(),
        performedBy: req.user._id,
        details: `Status changed from ${oldStatus} to ${req.body.status}`,
        version: updated.version,
        metadata: { oldStatus, newStatus: req.body.status }
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Revise a sent/active offer — freeze current version, open a new editable draft
// @route   POST /api/offers/:id/revise
// @access  Private
exports.reviseOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to revise this offer' });
    }

    if (offer.status === 'Draft') {
      return res.status(400).json({ message: 'This offer is still a draft. Edit it directly instead of revising.' });
    }

    const existingSnapshot = await OfferVersion.findOne({ offerId: offer._id, version: offer.version });
    if (!existingSnapshot) {
      await createVersionSnapshot(offer, {
        statusAtSnapshot: offer.status,
        requirement: '',
        changeSummary: '',
        emailRef: null,
        createdBy: offer.createdBy
      });
    }

    const newVersion = offer.version + 1;
    const requirement = (req.body.requirement || req.body.revisionNote || '').toString().trim();

    offer.version = newVersion;
    offer.status = 'Draft';
    offer.sentAt = null;
    offer.sentVia = null;
    offer.revisionNote = requirement;
    await offer.save();

    const updated = await offer.populate('createdBy', 'firstName lastName role');

    await OfferHistory.create({
      offerId: offer._id,
      action: 'revised',
      performedBy: req.user._id,
      details: `Revision v${newVersion} started${requirement ? `: ${requirement}` : ''}`,
      version: newVersion,
      changes: null,
      metadata: { fromVersion: newVersion - 1, toVersion: newVersion, requirement }
    });

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
  let step = 'init';
  try {
    const { method } = req.body;

    if (!method || !['Email', 'SMS', 'Both'].includes(method)) {
      return res.status(400).json({ message: 'Invalid send method. Use Email, SMS, or Both.' });
    }

    step = 'load-offer';
    const offer = await Offer.findById(req.params.id)
      .populate('lead')
      .populate('createdBy', 'firstName lastName');

    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    if (!offer.lead) {
      return res.status(400).json({ message: 'This offer is not linked to a valid lead. Cannot send.' });
    }

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy && offer.createdBy._id
      ? offer.createdBy._id.toString() === req.user._id.toString()
      : false;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to send this offer' });
    }

    const title = offer.title || 'Offer';
    const description = offer.description || '';
    const price = Number(offer.price) || 0;
    const validUntil = offer.validUntil ? new Date(offer.validUntil) : new Date();
    const agentName = offer.createdBy
      ? `${offer.createdBy.firstName || ''} ${offer.createdBy.lastName || ''}`.trim() || 'Agent'
      : 'Agent';
    const leadName = offer.lead.name || 'Customer';
    const offerType = offer.offerType || 'Service';

    step = 'build-content';
    const emailSubject = `New Offer: ${title}`;

    if (!offer.paymentToken) {
      offer.paymentToken = require('crypto').randomBytes(16).toString('hex');
      await offer.save();
    }
    const paymentLink = buildPaymentLink(offer.paymentToken);

    const textBody = [
      `Hello ${leadName},`,
      '',
      'We have a special offer for you!',
      '',
      title,
      description,
      '',
      `Price: $${price.toLocaleString()}`,
      `Valid Until: ${validUntil.toLocaleDateString()}`,
      '',
      paymentLink ? `Pay now: ${paymentLink}` : '',
      '',
      `Best regards,`,
      agentName,
    ].filter(Boolean).join('\n').trim();

    const imagesHtml = (offer.images && offer.images.length > 0)
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
           <tr><td>
             <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Offer Photos</p>
             <table role="presentation" cellspacing="8" cellpadding="0" border="0">
               <tr>
                 ${offer.images.map(img => {
                     const rawUrl = img && img.url ? String(img.url).trim() : '';
                     if (!rawUrl) return '';
                     const imgSrc = rawUrl.startsWith('http') ? rawUrl : `http://localhost:5000${rawUrl}`;
                     const safeCaption = (img && img.caption) ? img.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
                     return `
                   <td style="vertical-align:top;text-align:center;">
                     <img src="${imgSrc}" alt="${safeCaption || 'Offer image'}"
                       style="width:160px;height:160px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block;" />
                     ${safeCaption ? `<p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">${safeCaption}</p>` : ''}
                   </td>`;
                 }).filter(Boolean).join('')}
               </tr>
             </table>
           </td></tr>
         </table>`
      : '';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f4;">
    <tr><td align="center" style="padding:24px 0;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background-color:#2563eb;padding:24px 32px;color:#ffffff;">
          <h1 style="margin:0;font-size:20px;font-weight:600;">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">Hello ${leadName},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">${description}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:6px;margin:16px 0;">
            <tr><td style="padding:16px 24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Price</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#2563eb;">$${price.toLocaleString()}</p>
              <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Valid until <strong style="color:#334155;">${validUntil.toLocaleDateString()}</strong></p>
            </td></tr>
          </table>
          ${imagesHtml}
          ${offer.notes ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b;"><em>${offer.notes}</em></p>` : ''}
          ${paymentLink ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;">
            <tr><td>
              <a href="${paymentLink}" target="_blank" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;">Pay Now — $${price.toLocaleString()}</a>
            </td></tr>
          </table>` : ''}
          <p style="margin:24px 0 0;font-size:14px;color:#333333;line-height:1.6;">Best regards,<br><strong>${agentName}</strong></p>
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">Sent via Super CRM • ${new Date().toLocaleString()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim();

    const smsMessage = `${title} - $${price.toLocaleString()}. Valid until ${validUntil.toLocaleDateString()}. Reply for details.`;

    let globalConfig = null;
    if (method === 'Email' || method === 'Both') {
      step = 'load-global-email-config';
      globalConfig = await getGlobalEmailConfig();
    }

    let emailStatus = 'sent';
    let providerError = null;
    let emailDoc = null;

    if (method === 'Email' || method === 'Both') {
      step = 'create-email-record';
      try {
        emailDoc = await Email.create({
          senderId: req.user._id,
          recipientId: offer.lead._id,
          subject: emailSubject,
          body: textBody,
          htmlBody: htmlBody,
          fromEmail: req.user.smtpUser || req.user.email,
          toEmail: offer.lead.email,
          status: 'sent',
          offerId: offer._id,
          offerVersion: offer.version
        });
      } catch (emailCreateErr) {
        console.error('[OfferSend] Email.create failed:', emailCreateErr);
        return res.status(500).json({
          message: 'Failed to record email in database',
          error: emailCreateErr.message,
          step: 'create-email-record'
        });
      }

      step = 'send-email-smtp';
      try {
        await sendEmail(req.user, {
          to: offer.lead.email,
          subject: emailSubject,
          text: textBody,
          html: htmlBody,
        }, globalConfig);
      } catch (emailErr) {
        console.error('Failed to send offer email:', emailErr);
        emailStatus = 'failed';
        providerError = emailErr.message;
        if (emailDoc) {
          emailDoc.status = 'failed';
          emailDoc.providerError = emailErr.message;
          await emailDoc.save();
        }

        return res.status(400).json({
          success: false,
          message: 'Failed to send email. Please check your SMTP settings in your Profile.',
          error: emailErr.message
        });
      }
    }

    if (method === 'SMS' || method === 'Both') {
      if (offer.lead?.phone) {
        console.log(`[SMS] To: ${offer.lead.phone}`);
        console.log(`[SMS] Message: ${smsMessage}`);
      } else {
        console.warn(`[SMS] Skipped — no phone number for lead ${offer.lead?._id || offer.lead}`);
      }
    }

    step = 'version-snapshot';
    try {
      const prevVersionSnapshot = await OfferVersion.findOne({ offerId: offer._id, version: offer.version });
      const changeSummary = prevVersionSnapshot ? prevVersionSnapshot.changeSummary : '';

      if (emailStatus === 'sent') {
        await createVersionSnapshot(offer, {
          statusAtSnapshot: 'Sent',
          requirement: offer.revisionNote || '',
          changeSummary,
          emailRef: emailDoc ? emailDoc._id : null,
          createdBy: req.user._id
        });
      }
    } catch (versionErr) {
      console.error('[OfferSend] Version snapshot failed:', versionErr);
      return res.status(500).json({
        message: 'Failed to create version snapshot',
        error: versionErr.message,
        step: 'version-snapshot'
      });
    }

    step = 'update-offer-status';
    try {
      offer.status = 'Sent';
      offer.sentAt = new Date();
      offer.sentVia = method;
      await offer.save();
    } catch (saveErr) {
      console.error('[OfferSend] Offer save failed:', saveErr);
      return res.status(500).json({
        message: 'Failed to update offer status',
        error: saveErr.message,
        step: 'update-offer-status'
      });
    }

    step = 'create-history';
    try {
      const sentEmailId = emailDoc ? emailDoc._id : null;
      await OfferHistory.create({
        offerId: offer._id,
        action: emailStatus === 'failed' ? 'sent' : 'version_sent',
        performedBy: req.user._id,
        details: emailStatus === 'failed'
          ? `Send via ${method} failed (offer not updated)`
          : `Offer sent via ${method}`,
        version: offer.version,
        versionRef: sentEmailId,
        metadata: { method, sentVia: method, emailStatus, providerError }
      });
    } catch (historyErr) {
      console.error('[OfferSend] History create failed:', historyErr);
      return res.status(500).json({
        message: 'Failed to create offer history',
        error: historyErr.message,
        step: 'create-history'
      });
    }

    res.json({ success: true, message: `Offer sent via ${method}`, data: offer });
  } catch (error) {
    console.error('[OfferSend] Failed:', {
      step,
      offerId: req.params.id,
      method: req.body?.method,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Failed to send offer', error: error.message, step });
  }
};

// @desc    Get all offer versions for an offer
// @route   GET /api/offers/:id/versions
// @access  Private
exports.getOfferVersions = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to view versions for this offer' });
    }

    const versions = await OfferVersion.find({ offerId: offer._id })
      .populate('emailRef', 'subject toEmail status sentAt providerError')
      .populate('createdBy', 'firstName lastName')
      .sort({ version: -1 });

    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single offer version snapshot
// @route   GET /api/offers/:id/versions/:vid
// @access  Private
exports.getOfferVersion = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to view this version' });
    }

    const version = await OfferVersion.findOne({ offerId: offer._id, version: parseInt(req.params.vid) })
      .populate('emailRef', 'subject toEmail status sentAt htmlBody body providerError fromEmail')
      .populate('createdBy', 'firstName lastName');

    if (!version) return res.status(404).json({ message: 'Version not found' });

    res.json({ success: true, data: version });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get offer history
// @route   GET /api/offers/:id/history
// @access  Private
exports.getOfferHistory = async (req, res) => {
  try {
    const history = await OfferHistory.find({ offerId: req.params.id })
      .populate('performedBy', 'firstName lastName email role')
      .populate('versionRef', 'version statusAtSnapshot changeSummary')
      .sort({ timestamp: -1 });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
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

    const uniqueFilename = `offers/offer-${Date.now()}-${req.file.originalname}`;
    const blob = await put(uniqueFilename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    const imageUrl = blob.url;
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

// @desc    Get the public payment link for an offer
// @route   GET /api/offers/:id/payment-link
// @access  Private
exports.getPaymentLink = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to view this offer\'s payment link' });
    }

    if (!offer.paymentToken) {
      offer.paymentToken = require('crypto').randomBytes(16).toString('hex');
      await offer.save();
    }

    res.json({ success: true, data: { link: buildPaymentLink(offer.paymentToken) } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
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

// @desc    Get offer history
// @route   GET /api/offers/:id/history
// @access  Private
exports.getOfferHistory = async (req, res) => {
  try {
    const history = await OfferHistory.find({ offerId: req.params.id })
      .populate('performedBy', 'firstName lastName email role')
      .populate('versionRef', 'version statusAtSnapshot changeSummary')
      .sort({ timestamp: -1 });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Shared authorization check for an offer's version/history access.
async function assertOfferAccess(offer, req) {
  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
  const isOwner = offer.createdBy._id.toString() === req.user._id.toString();
  if (!isAdmin && !isOwner) {
    return false;
  }
  return true;
}

// @desc    List all previously sent/revised versions of an offer
// @route   GET /api/offers/:id/versions
// @access  Private
exports.getOfferVersions = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    if (!await assertOfferAccess(offer, req)) {
      return res.status(403).json({ message: 'Not authorized to view this offer\'s versions' });
    }

    const versions = await OfferVersion.find({ offerId: offer._id })
      .populate('emailRef', 'subject toEmail status sentAt htmlBody')
      .populate('createdBy', 'firstName lastName')
      .sort({ version: -1 });

    res.json({ success: true, data: versions, currentVersion: offer.version });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single version snapshot (with the exact sent content)
// @route   GET /api/offers/:id/versions/:vid
// @access  Private
exports.getOfferVersion = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    if (!await assertOfferAccess(offer, req)) {
      return res.status(403).json({ message: 'Not authorized to view this offer\'s versions' });
    }

    const version = await OfferVersion.findOne({ offerId: offer._id, version: Number(req.params.vid) })
      .populate('emailRef', 'subject toEmail fromEmail status sentAt htmlBody body')
      .populate('createdBy', 'firstName lastName');

    if (!version) return res.status(404).json({ message: 'Version not found' });

    res.json({ success: true, data: version });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
