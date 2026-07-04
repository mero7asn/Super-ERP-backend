const Offer = require('../models/Offer');
const Lead = require('../models/Lead');
const User = require('../models/User');

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
    const { lead, title, description, price, validUntil, notes } = req.body;

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

    // Check permissions
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
      price,
      validUntil,
      notes: notes || ''
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

    // Build message content
    const emailSubject = `New Offer: ${offer.title}`;
    const emailBody = `
Hello ${offer.lead.name},

We have a special offer for you!

${offer.title}
${offer.description}

Price: $${offer.price.toLocaleString()}
Valid Until: ${new Date(offer.validUntil).toLocaleDateString()}

Best regards,
${offer.createdBy.firstName} ${offer.createdBy.lastName}
    `.trim();

    const smsMessage = `${offer.title} - $${offer.price}. Valid until ${new Date(offer.validUntil).toLocaleDateString()}. Reply for details.`;

    // Send via selected method(s)
    if (method === 'Email' || method === 'Both') {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      console.log(`Sending email to ${offer.lead.email}:`);
      console.log(`Subject: ${emailSubject}`);
      console.log(`Body: ${emailBody}`);
    }
    if (method === 'SMS' || method === 'Both') {
      if (offer.lead.phone) {
        // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        console.log(`Sending SMS to ${offer.lead.phone}:`);
        console.log(`Message: ${smsMessage}`);
      }
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
