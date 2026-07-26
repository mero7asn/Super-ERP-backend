const Offer = require('../models/Offer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { buildPaymentLink } = require('./paymentController');
const { getGlobalEmailConfig, sendEmail } = require('../services/emailService');
const EmailTemplate = require('../models/EmailTemplate');

const formatCurrency = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : '$0.00';
};

const formatOfferDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'TBD' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getLeadDisplayName = (lead) => {
  if (!lead) return 'there';
  if (lead.name && String(lead.name).trim()) return String(lead.name).trim();
  const first = lead.firstName ? String(lead.firstName).trim() : '';
  const last = lead.lastName ? String(lead.lastName).trim() : '';
  return [first, last].filter(Boolean).join(' ') || 'there';
};

const buildOfferEmailData = (offer, req, branding, payLink) => {
  const lead = offer?.lead || {};
  const leadName = getLeadDisplayName(lead);
  const senderFirst = req?.user?.firstName || '';
  const senderLast = req?.user?.lastName || '';

  return {
    companyName: branding?.companyName || 'Super CRM',
    companyLogo: branding?.companyLogo || '',
    lead: {
      name: leadName,
      firstName: lead?.firstName || leadName.split(' ')[0] || '',
      lastName: lead?.lastName || leadName.split(' ').slice(1).join(' ') || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
    },
    offer: {
      title: offer?.title || 'Proposal',
      description: offer?.description || 'A tailored solution prepared for your review.',
      price: offer?.price || 0,
      validUntil: offer?.validUntil || null,
      id: offer?._id ? offer._id.toString().slice(-6).toUpperCase() : 'OFFER',
    },
    payLink,
    sender: {
      firstName: senderFirst,
      lastName: senderLast,
      name: [senderFirst, senderLast].filter(Boolean).join(' ') || 'Super CRM Team',
    },
  };
};

const replaceOfferPlaceholders = (content, data) => {
  if (!content || typeof content !== 'string') return '';

  const escapedContent = content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    const value = key.split('.').reduce((current, segment) => {
      if (!current || typeof current !== 'object') return '';
      return current[segment] ?? '';
    }, data);

    if (value === null || value === undefined || value === '') return '';

    if (typeof value === 'number') return value.toLocaleString('en-US');
    if (value instanceof Date) return value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return String(value);
  });

  return escapedContent
    .replace(/\{\{offer\.price\}\}/g, formatCurrency(data?.offer?.price || 0))
    .replace(/\{\{offer\.validUntil\}\}/g, formatOfferDate(data?.offer?.validUntil))
    .replace(/\{\{offer\.id\}\}/g, data?.offer?.id || '')
    .replace(/\{\{lead\.name\}\}/g, data?.lead?.name || '')
    .replace(/\{\{lead\.firstName\}\}/g, data?.lead?.firstName || '')
    .replace(/\{\{lead\.lastName\}\}/g, data?.lead?.lastName || '')
    .replace(/\{\{lead\.email\}\}/g, data?.lead?.email || '')
    .replace(/\{\{offer\.title\}\}/g, data?.offer?.title || '')
    .replace(/\{\{offer\.description\}\}/g, data?.offer?.description || '')
    .replace(/\{\{payLink\}\}/g, data?.payLink || '')
    .replace(/\{\{companyName\}\}/g, data?.companyName || '')
    .replace(/\{\{sender\.firstName\}\}/g, data?.sender?.firstName || '')
    .replace(/\{\{sender\.lastName\}\}/g, data?.sender?.lastName || '')
    .replace(/\{\{sender\.name\}\}/g, data?.sender?.name || '');
};

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

    const SystemSetting = require('../models/SystemSetting');
    const minSetting = await SystemSetting.findOne({ key: offerType === 'Product' ? 'productPriceMin' : 'offerPriceMin' });
    const minPrice = minSetting?.value ?? 0;
    if (numPrice < minPrice) {
      return res.status(400).json({ message: `Minimum price for ${offerType === 'Product' ? 'product' : 'offer'} is ${minPrice.toFixed(2)}` });
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

    if (req.body.price !== undefined) {
      const newPrice = Number(req.body.price);
      if (Number.isNaN(newPrice) || newPrice < 0) {
        return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      }
      const SystemSetting = require('../models/SystemSetting');
      const minSetting = await SystemSetting.findOne({ key: offer.offerType === 'Product' ? 'productPriceMin' : 'offerPriceMin' });
      const minPrice = minSetting?.value ?? 0;
      if (newPrice < minPrice) {
        return res.status(400).json({ message: `Minimum price for ${offer.offerType === 'Product' ? 'product' : 'offer'} is ${minPrice.toFixed(2)}` });
      }
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

const prepareEmailWithCid = (html, branding) => {
  const attachments = [];
  let cidCounter = 0;
  
  let modifiedHtml = html.replace(/src=(["'])(data:image\/[^;]+;base64,[^"']*)\1/g, (match, quote, base64Data) => {
    const cid = `img_${++cidCounter}_${Date.now()}`;
    const mimeMatch = base64Data.match(/data:(image\/[^;]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
    
    attachments.push({
      cid,
      content: Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
      contentType,
      filename: `image_${cidCounter}.png`,
    });
    
    return `src=${quote}cid:${cid}${quote}`;
  });
  
  if (branding?.companyLogo && branding.companyLogo.startsWith('data:image')) {
    const cid = `logo_${Date.now()}`;
    const mimeMatch = branding.companyLogo.match(/data:(image\/[^;]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
    
    attachments.push({
      cid,
      content: Buffer.from(branding.companyLogo.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
      contentType,
      filename: 'company_logo.png',
    });
    
    const logoSrc = `src="${branding.companyLogo}"`;
    const logoCid = `src="cid:${cid}"`;
    modifiedHtml = modifiedHtml.split(logoSrc).join(logoCid);
  }
  
  return { html: modifiedHtml, attachments };
};

// @desc    Send offer via email/SMS
// @route   POST /api/offers/:id/send
// @access  Private
exports.sendOffer = async (req, res) => {
  try {
    const requestBody = req.body || {};
    const requestedMethod = typeof requestBody.method === 'string' ? requestBody.method : 'Email';
    const { templateId, to, cc, bcc, subject, from, html, attachments: composerAttachments } = requestBody;
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    console.log('[sendOffer] requestBody keys=%s method=%s files=%d', Object.keys(requestBody).join(','), requestedMethod, uploadedFiles.length);
    console.log('[sendOffer] attachments=%O', Array.isArray(composerAttachments) ? composerAttachments.map(a => ({ name: a?.name, type: a?.type, url: typeof a?.url === 'string' ? a.url.slice(0, 40) : a?.url })) : 'n/a');

    const offer = await Offer.findById(req.params.id).populate('lead').populate('createdBy', 'firstName lastName');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = offer.createdBy._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to send this offer' });
    }

    const method = ['Email', 'SMS', 'Both'].includes(requestedMethod) ? requestedMethod : 'Email';

    const payLink = buildPaymentLink(offer.paymentToken);

    let emailSent = true;
    let smsSent = true;
    let sendError = null;

    if (method === 'Email' || method === 'Both') {
      const brandingSetting = await SystemSetting.findOne({ key: 'branding' });
      const branding = brandingSetting?.value || { companyName: 'Super CRM', companyLogo: '' };

      const emailData = buildOfferEmailData(offer, req, branding, payLink);

      let emailHtml = html || '';
      let brandedSubject = subject || `New Offer: ${offer.title}`;

      if (!emailHtml) {
        try {
          let userTemplate = null;
          if (templateId) {
            userTemplate = await EmailTemplate.findById(templateId);
          } else {
            userTemplate = await EmailTemplate.findOne({
              $or: [
                { createdBy: offer.createdBy._id, isDefault: true },
                { isDefault: true }
              ]
            }).sort({ createdAt: -1 });
          }

          if (userTemplate) {
            const { replacePlaceholders, renderTemplateBlocks } = require('./templateController');
            const templateData = {
              companyName: branding.companyName || 'Super CRM',
              companyLogo: branding.companyLogo || '',
              lead: {
                name: offer.lead?.name || getLeadDisplayName(offer.lead),
                firstName: offer.lead?.firstName || '',
                lastName: offer.lead?.lastName || '',
                email: offer.lead?.email || '',
                phone: offer.lead?.phone || ''
              },
              offer: {
                title: offer.title,
                description: offer.description,
                price: offer.price,
                validUntil: offer.validUntil
              },
              payLink,
              sender: { firstName: req.user.firstName, lastName: req.user.lastName }
            };

            brandedSubject = replacePlaceholders(userTemplate.subject, templateData);
            emailHtml = renderTemplateBlocks(userTemplate.blocks, templateData);
          }
        } catch (templateErr) {
          console.error('Template render error, falling back to default:', templateErr.message);
        }
      }

      if (!emailHtml) {
        const emailBody = `
Hello ${leadName},

We have prepared a tailored offer for you from ${branding.companyName || 'Super CRM'}.

${offer.title}
${offer.description}

Price: ${formatCurrency(offer.price)}
Valid Until: ${formatOfferDate(offer.validUntil)}

Complete your payment here:
${payLink}

Best regards,
${req.user.firstName} ${req.user.lastName}
        `.trim();

        emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);padding:28px 32px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#bfdbfe;margin-bottom:8px;">Professional Proposal</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;">${branding.companyName || 'Super CRM'}</h1>
          <p style="margin:6px 0 0;font-size:14px;color:#dbeafe;">A tailored offer prepared for ${leadName}</p>
        </td></tr>
        <tr><td style="padding:32px;color:#0f172a;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;">Hello ${leadName},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">We are pleased to share a proposal prepared specifically for your review. The details below outline the offer, pricing, and next steps.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:0 0 20px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;">
              <div>
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2563eb;">Official Offer</div>
                <h2 style="margin:8px 0 6px;font-size:22px;color:#111827;">${offer.title}</h2>
              </div>
              <div style="font-size:24px;font-weight:800;color:#2563eb;white-space:nowrap;">${formatCurrency(offer.price)}</div>
            </div>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#475569;">${offer.description}</p>
            ${(offer.images && offer.images.length > 0) ? `
            <div style="margin:0 0 16px;display:flex;flex-direction:column;gap:12px;">
              ${offer.images.map(img => `<img src="${img.url}" alt="${img.caption || 'Offer image'}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;" />`).join('')}
            </div>` : ''}
            <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:#64748b;padding-top:12px;border-top:1px dashed #cbd5e1;">
              <div><strong>Valid Until:</strong> ${formatOfferDate(offer.validUntil)}</div>
              <div><strong>Offer ID:</strong> #${offer._id ? offer._id.toString().slice(-6).toUpperCase() : 'OFFER'}</div>
            </div>
          </div>
          <div style="text-align:center;margin:24px 0 28px;">
            <a href="${payLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;">Review & Pay Online</a>
          </div>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#475569;">If you have any questions, reply to this email and we will be happy to assist.</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#0f172a;">Best regards,<br />${req.user.firstName} ${req.user.lastName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `.trim();
      }

      emailHtml = replaceOfferPlaceholders(emailHtml, emailData);
      brandedSubject = replaceOfferPlaceholders(brandedSubject, emailData);

      if (offer.images && offer.images.length > 0) {
        const imagesHtml = offer.images.map(img => `<img src="${img.url}" alt="${img.caption || 'Offer image'}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:12px;" />`).join('');
        if (emailHtml.includes('</body>')) {
          emailHtml = emailHtml.replace('</body>', `${imagesHtml}</body>`);
        } else if (emailHtml.includes('</html>')) {
          emailHtml = emailHtml.replace('</html>', `${imagesHtml}</html>`);
        } else {
          emailHtml = `${emailHtml}${imagesHtml}`;
        }
      }

      const { html: finalHtml, attachments: cidAttachments } = prepareEmailWithCid(emailHtml, branding);

      const nodemailerAttachments = (cidAttachments || []).map((att) => ({
        filename: att.filename || 'image.png',
        cid: att.cid,
        content: att.content || Buffer.from(''),
        contentType: att.contentType || 'image/png',
      }));

      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          nodemailerAttachments.push({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype,
          });
        }
      }

      try {
        const senderUser = await User.findById(req.user._id).select('+smtpPass');
        const globalCfg = await getGlobalEmailConfig();
        console.log('[sendOffer] Global SMTP config:', globalCfg ? `host=${globalCfg.smtpHost} user=${globalCfg.smtpUser}` : 'not set');
        console.log('[sendOffer] User SMTP config:', senderUser?.smtpHost ? `host=${senderUser.smtpHost} user=${senderUser.smtpUser}` : 'not set');
        await sendEmail(senderUser, {
          to: to || offer.lead.email,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject: brandedSubject,
          text: finalHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          html: finalHtml,
          replyTo: from || senderUser?.email,
          attachments: nodemailerAttachments,
        }, globalCfg);
      } catch (err) {
        console.error('[sendOffer] Email delivery failed:', err.message);
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
      return res.status(500).json({ message: 'Failed to send offer by email', error: sendError?.message || 'Email send failed', hint: 'Verify SMTP settings in Admin > Settings or user profile.' });
    }
    if ((method === 'SMS' || method === 'Both') && !smsSent) {
      return res.status(500).json({ message: 'Failed to send offer by SMS', error: sendError?.message || 'SMS send failed', hint: 'SMS provider not configured. Use Email only or integrate an SMS provider.' });
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
// @route   GET /api/offers/templates
// @access  Private
exports.replaceOfferPlaceholders = replaceOfferPlaceholders;

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

    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64}`;
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
