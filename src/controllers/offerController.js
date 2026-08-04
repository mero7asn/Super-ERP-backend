const Offer = require('../models/Offer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { buildPaymentLink } = require('./paymentController');
const { getGlobalEmailConfig, sendEmail } = require('../services/emailService');
const EmailTemplate = require('../models/EmailTemplate');
const OfferEmail = require('../models/OfferEmail');
const { initiateTelephonyCall } = require('../services/telephonyService');

const formatCurrency = (value, currencyCode = 'USD', currencySymbol = '') => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return `${currencySymbol || currencyCode || 'USD'}0.00`;
  }

  const normalizedCurrency = String(currencyCode || 'USD').trim().toUpperCase();
  const symbol = currencySymbol || (normalizedCurrency === 'USD' ? '$' : normalizedCurrency === 'EUR' ? '€' : normalizedCurrency === 'EGP' ? 'E£' : '');

  if (symbol) {
    return `${symbol}${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${normalizedCurrency} ${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    companyName: branding?.companyName || 'Core 360',
    companyLogo: branding?.companyLogo || '',
    currency: offer?.currency || 'USD',
    currencySymbol: offer?.currencySymbol || '',
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
      currency: offer?.currency || 'USD',
      currencySymbol: offer?.currencySymbol || '',
      validUntil: offer?.validUntil || null,
      id: offer?._id ? offer._id.toString().slice(-6).toUpperCase() : 'OFFER',
    },
    payLink,
    sender: {
      firstName: senderFirst,
      lastName: senderLast,
      name: [senderFirst, senderLast].filter(Boolean).join(' ') || 'Core 360 Team',
    },
  };
};

const replaceOfferPlaceholders = (content, data) => {
  if (!content || typeof content !== 'string') return '';

  const specialValues = {
    'offer.price': formatCurrency(data?.offer?.price || 0, data?.offer?.currency || data?.currency || 'USD', data?.offer?.currencySymbol || data?.currencySymbol || ''),
    'offer.validUntil': formatOfferDate(data?.offer?.validUntil),
    'offer.id': data?.offer?.id || '',
    'lead.name': data?.lead?.name || '',
    'lead.firstName': data?.lead?.firstName || '',
    'lead.lastName': data?.lead?.lastName || '',
    'lead.email': data?.lead?.email || '',
    'offer.title': data?.offer?.title || '',
    'offer.description': data?.offer?.description || '',
    'payLink': data?.payLink || '',
    'companyName': data?.companyName || '',
    'sender.firstName': data?.sender?.firstName || '',
    'sender.lastName': data?.sender?.lastName || '',
    'sender.name': data?.sender?.name || '',
  };

  return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    if (specialValues[key] !== undefined) return specialValues[key];

    const value = key.split('.').reduce((current, segment) => {
      if (!current || typeof current !== 'object') return '';
      return current[segment] ?? '';
    }, data);

    if (value === null || value === undefined || value === '') return '';

    if (typeof value === 'number') return value.toLocaleString('en-US');
    if (value instanceof Date) return value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return String(value);
  });
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

    const { lead, title, description, price, validUntil, notes, offerType, catalogProduct, currency, currencySymbol } = body;

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
    const defaultCurrencySetting = await SystemSetting.findOne({ key: 'defaultCurrency' });
    const currencyCode = String(currency || defaultCurrencySetting?.value || 'USD').trim().toUpperCase();
    const currencyInfoSetting = await SystemSetting.findOne({ key: 'currencies' });
    const currencyInfo = Array.isArray(currencyInfoSetting?.value) ? currencyInfoSetting.value.find((entry) => String(entry?.code || '').toUpperCase() === currencyCode) : null;
    const resolvedCurrencySymbol = currencySymbol || currencyInfo?.symbol || '';
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
      currency: currencyCode,
      currencySymbol: resolvedCurrencySymbol,
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

const injectBrandingHeader = (html, branding) => {
  if (!html || typeof html !== 'string') return html;

  const companyName = branding?.companyName || 'Core 360';
  const companyLogo = branding?.companyLogo || '';

  if (!companyName && !companyLogo) return html;

  const logoMarkup = companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image/')
    ? `<img src="${companyLogo}" alt="${companyName}" style="height:54px;width:auto;max-width:180px;display:block;margin:0 auto 14px;border:0;" />`
    : '';

  const headerMarkup = `
    <div style="margin:0 0 24px;padding:24px 24px 20px;background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,0.05);">
      <div style="text-align:center;">
        ${logoMarkup}
        <div style="font-size:24px;font-weight:700;color:#111827;">${companyName}</div>
      </div>
    </div>`;

  if (html.includes('<body')) {
    return html.replace(/<body[^>]*>/i, (match) => `${match}${headerMarkup}`);
  }

  return `${headerMarkup}${html}`;
};

const injectOfferImagesBeforePaymentButton = (html, offer, payLink) => {
  if (!html || typeof html !== 'string' || !offer?.images?.length) return html;

  const imagesHtml = `
    <div style="margin: 24px 0 28px; text-align: center;">
      ${offer.images.map((img) => {
        const imageUrl = img?.url || '';
        const altText = img?.caption || 'Offer image';
        return `<img src="${imageUrl}" alt="${altText}" style="display:block;max-width:480px;width:100%;height:auto;margin:0 auto 16px;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 10px 24px rgba(15,23,42,0.08);background:#ffffff;" />`;
      }).join('')}
    </div>`;

  if (!payLink) {
    return html.includes('</body>')
      ? html.replace('</body>', `${imagesHtml}</body>`)
      : html.includes('</html>')
        ? html.replace('</html>', `${imagesHtml}</html>`)
        : `${html}${imagesHtml}`;
  }

  const escapedPayLink = payLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<a[^>]*href=["']${escapedPayLink}["'][^>]*>)`, 'i');

  if (pattern.test(html)) {
    return html.replace(pattern, `${imagesHtml}$1`);
  }

  return html.includes('</body>')
    ? html.replace('</body>', `${imagesHtml}</body>`)
    : html.includes('</html>')
      ? html.replace('</html>', `${imagesHtml}</html>`)
      : `${html}${imagesHtml}`;
};

const prepareEmailWithCid = (html, branding) => {
  const attachments = [];
  let cidCounter = 0;

  const logoPlaceholder = '__SUPER_CRM_LOGO_PLACEHOLDER__';
  let htmlWithLogoPlaceholder = html;

  if (branding?.companyLogo && typeof branding.companyLogo === 'string' && branding.companyLogo.startsWith('data:image/')) {
    htmlWithLogoPlaceholder = htmlWithLogoPlaceholder.split(branding.companyLogo).join(logoPlaceholder);
  }

  let modifiedHtml = htmlWithLogoPlaceholder.replace(/src=(["'])(data:image\/[^;]+;base64,[^"']*)\1/g, (match, quote, base64Data) => {
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

  if (branding?.companyLogo && typeof branding.companyLogo === 'string' && branding.companyLogo.startsWith('data:image/')) {
    modifiedHtml = modifiedHtml.split(logoPlaceholder).join(branding.companyLogo);
  }

  return { html: modifiedHtml, attachments };
};

exports.injectBrandingHeader = injectBrandingHeader;
exports.injectOfferImagesBeforePaymentButton = injectOfferImagesBeforePaymentButton;
exports.prepareEmailWithCid = prepareEmailWithCid;

exports.getOfferCommunicationLog = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const logs = await OfferEmail.find({ offerId: offer._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load offer communications', error: error.message });
  }
};

exports.addOfferCommunicationReply = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('lead');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const { body, subject } = req.body || {};
    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'Reply body is required' });
    }

    const entry = await OfferEmail.create({
      offerId: offer._id,
      leadId: offer.lead._id,
      direction: 'inbound',
      subject: subject || 'Customer reply',
      body: String(body).trim(),
      status: 'received',
      senderName: offer.lead?.name || 'Customer',
      senderEmail: offer.lead?.email || '',
      recipientEmail: req.user?.email || '',
      recipientName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Sales Team',
      createdBy: req.user?._id || null,
      metadata: { source: 'offer-thread' },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save customer reply', error: error.message });
  }
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
    const parsedComposerAttachments = Array.isArray(composerAttachments)
      ? composerAttachments
      : (Array.isArray(requestBody.attachments) ? requestBody.attachments : []);
    console.log('[sendOffer] requestBody keys=%s method=%s files=%d', Object.keys(requestBody).join(','), requestedMethod, uploadedFiles.length);
    console.log('[sendOffer] attachments=%O', parsedComposerAttachments.map(a => ({ name: a?.name, type: a?.type, url: typeof a?.url === 'string' ? a.url.slice(0, 40) : a?.url })));

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
      const branding = brandingSetting?.value || { companyName: 'Core 360', companyLogo: '' };

      const emailData = buildOfferEmailData(offer, req, branding, payLink);
      const offerCurrency = offer?.currency || 'USD';
      const offerCurrencySymbol = offer?.currencySymbol || '';
      const leadName = emailData.lead.name || getLeadDisplayName(offer?.lead);

      let emailHtml = html || '';
      let brandedSubject = subject || `Your offer is ready from ${branding.companyName || 'Core 360'}`;

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
              companyName: branding.companyName || 'Core 360',
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

We have prepared a tailored offer for you from ${branding.companyName || 'Core 360'}.

${offer.title}
${offer.description}

Price: ${formatCurrency(offer.price, offerCurrency, offerCurrencySymbol)}
Valid Until: ${formatOfferDate(offer.validUntil)}

Complete your payment here:
${payLink}

Best regards,
${req.user.firstName} ${req.user.lastName}
        `.trim();

        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Offer Is Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f8f8;font-family:Arial, Helvetica, sans-serif;color:#333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f8f8;padding:30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 10px 30px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="text-align:center;">
                    ${branding.companyLogo ? `<img src="${branding.companyLogo}" alt="${branding.companyName || 'Company logo'}" style="height:50px;width:auto;max-width:180px;display:block;margin:0 auto 16px;border:0;" />` : `<div style="height:50px;width:50px;line-height:50px;text-align:center;border-radius:50%;background:#d6a24c;color:#ffffff;font-weight:700;font-size:18px;margin:0 auto 16px;">${(branding.companyName || 'SC').slice(0, 2).toUpperCase()}</div>`}
                    <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#d6a24c;font-weight:700;margin-bottom:6px;">Professional Offer</div>
                    <div style="font-size:24px;font-weight:700;color:#333333;">${branding.companyName || 'Core 360'}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="text-align:center;padding:10px 0 24px;">
                <div style="font-size:34px;line-height:1.2;font-family:Georgia, 'Times New Roman', serif;color:#444444;margin-bottom:6px;">Welcome</div>
                <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#d6a24c;font-weight:700;margin-bottom:8px;">to the</div>
                <div style="font-size:30px;font-weight:700;color:#333333;">TEAM</div>
              </div>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555555;">Hello ${leadName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555555;">We are pleased to share your personalized offer for <strong>${offer.title}</strong> with ${branding.companyName || 'our team'}. The details below outline the proposal, pricing, and the next step to review and accept it.</p>
              <div style="background:#faf7f0;border:1px solid #efe3c8;border-radius:6px;padding:20px;margin:24px 0;">
                <div style="font-size:20px;font-weight:700;color:#333333;margin-bottom:10px;">${offer.title}</div>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#555555;">${offer.description}</p>
                <div style="font-size:14px;color:#666666;line-height:1.8;">
                  <div><strong>Offer Value:</strong> ${formatCurrency(offer.price, offerCurrency, offerCurrencySymbol)}</div>
                  <div><strong>Valid Until:</strong> ${formatOfferDate(offer.validUntil)}</div>
                  <div><strong>Offer ID:</strong> #${offer._id ? offer._id.toString().slice(-6).toUpperCase() : 'OFFER'}</div>
                </div>
              </div>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#333333;font-weight:700;">We welcome you onboard and look forward to working with you to take this opportunity to the next level.</p>
              <div style="text-align:center;margin:28px 0 8px;">
                <a href="${payLink}" style="display:inline-block;background-color:#1f2937;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:5px;font-weight:700;font-size:15px;min-height:44px;line-height:1;">Review & Pay Online</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <div style="border-top:1px solid #eeeeee;padding-top:24px;margin-top:12px;font-size:14px;line-height:1.7;color:#666666;">
                Best regards,<br />
                <strong>${req.user.firstName} ${req.user.lastName}</strong><br />
                ${branding.companyName || 'Core 360'}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim();
      }

      emailHtml = replaceOfferPlaceholders(emailHtml, emailData);
      brandedSubject = replaceOfferPlaceholders(brandedSubject, emailData);
      emailHtml = injectBrandingHeader(emailHtml, branding);
      emailHtml = injectOfferImagesBeforePaymentButton(emailHtml, offer, payLink);

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

    if (method === 'Email' || method === 'Both') {
      await OfferEmail.create({
        offerId: offer._id,
        leadId: offer.lead._id,
        direction: 'outbound',
        subject: brandedSubject || `Offer sent: ${offer.title}`,
        body: finalHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        status: emailSent ? 'sent' : 'failed',
        senderId: req.user._id,
        senderName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Sales Team',
        senderEmail: senderUser?.email || req.user?.email || '',
        recipientEmail: to || offer.lead.email,
        recipientName: offer.lead?.name || 'Lead',
        createdBy: req.user._id,
        metadata: { method, subject: brandedSubject },
      });
    }

    res.json({ success: true, message: `Offer sent via ${method}`, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send offer', error: error.message });
  }
};

const OfferTemplate = require('../models/OfferTemplate');
// @route   GET /api/offers/templates
// @access  Private
exports.replaceOfferPlaceholders = replaceOfferPlaceholders;
exports.injectOfferImagesBeforePaymentButton = injectOfferImagesBeforePaymentButton;

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

    const telephonySetting = await SystemSetting.findOne({ key: 'telephony' });
    const provider = String(req.body?.provider || telephonySetting?.value?.provider || 'avaya').toLowerCase();
    const config = telephonySetting?.value || {};
    const phoneNumber = String(req.body?.phone || offer?.lead?.phone || '').trim();

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Lead does not have a phone number configured' });
    }

    const agent = await User.findById(req.user._id);
    const extension = agent?.avayaExtension || agent?.ciscoExtension || agent?.extension || '';

    const result = await initiateTelephonyCall({
      config: { ...config, provider, extension },
      phoneNumber,
      agentExtension: extension,
    });

    console.log(`[${provider.toUpperCase()} Call] ${result.message}`);
    console.log(`[${provider.toUpperCase()} Call] Lead: ${offer.lead.name}, Offer: ${offer.title}`);

    res.json({
      success: true,
      message: result.message || `Call initiated to ${phoneNumber}`,
      data: {
        leadPhone: phoneNumber,
        provider,
        agentExtension: extension,
        telephonyStatus: result.status,
        callId: result.callId,
      }
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

// @desc    Get offer by ID
// @route   GET /api/offers/:id
// @access  Private
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('lead', 'name email phone referenceNumber')
      .populate('createdBy', 'firstName lastName');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isCreator = offer.createdBy && offer.createdBy._id.toString() === req.user._id.toString();
    const isAssigned = offer.lead && offer.lead.assignedTo && offer.lead.assignedTo.toString() === req.user._id.toString();
    const isManager = req.user.role === 'Sales Manager';

    if (!isAdmin && !isCreator && !isAssigned) {
      if (isManager) {
        const teamAgents = await User.find({ supervisor: req.user._id, role: 'Sales Agent' }).select('_id');
        const agentIds = teamAgents.map(a => a._id.toString());
        if (!agentIds.includes(offer.lead?.assignedTo?.toString() || '')) {
          return res.status(403).json({ message: 'Not authorized to view this offer' });
        }
      } else {
        return res.status(403).json({ message: 'Not authorized to view this offer' });
      }
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
