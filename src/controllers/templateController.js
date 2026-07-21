const EmailTemplate = require('../models/EmailTemplate');

// @desc    Get all email templates
// @route   GET /api/templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const { role } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    let query = { isActive: true };
    if (role) {
      query.$or = [
        { role: role },
        { role: null },
        { createdBy: userId }
      ];
    } else {
      query.$or = [
        { createdBy: userId },
        { isDefault: true },
        { role: null }
      ];
    }

    const templates = await EmailTemplate.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single email template
// @route   GET /api/templates/:id
// @access  Private
exports.getTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create email template
// @route   POST /api/templates
// @access  Private
exports.createTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update email template
// @route   PUT /api/templates/:id
// @access  Private
exports.updateTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = template.createdBy.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this template' });
    }

    const updated = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete email template
// @route   DELETE /api/templates/:id
// @access  Private
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwner = template.createdBy.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this template' });
    }

    await EmailTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Set template as default
// @route   POST /api/templates/:id/set-default
// @access  Private
exports.setDefaultTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can set default templates' });
    }

    await EmailTemplate.updateMany({}, { isDefault: false });
    template.isDefault = true;
    await template.save();

    res.json({ success: true, message: 'Default template updated', data: template });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Render template with sample data for preview
// @route   POST /api/templates/:id/render
// @access  Private
exports.renderTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const sampleData = req.body.sampleData || {
      companyName: 'Super CRM',
      companyLogo: '',
      lead: { name: 'John Doe', email: 'john@example.com' },
      offer: { title: 'Premium Service Package', description: 'A comprehensive service solution tailored to your needs.', price: 2999, validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      payLink: 'https://example.com/pay/sample-token',
      sender: { firstName: 'Admin', lastName: 'User' }
    };

    const rendered = renderTemplateBlocks(template.blocks, sampleData);
    const renderedSubject = replacePlaceholders(template.subject, sampleData);

    res.json({ success: true, data: { subject: renderedSubject, html: rendered } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

function replacePlaceholders(text, data) {
  if (!text) return '';
  return text
    .replace(/\{\{companyName\}\}/g, data.companyName || '')
    .replace(/\{\{companyLogo\}\}/g, data.companyLogo || '')
    .replace(/\{\{lead\.name\}\}/g, data.lead?.name || '')
    .replace(/\{\{lead\.email\}\}/g, data.lead?.email || '')
    .replace(/\{\{offer\.title\}\}/g, data.offer?.title || '')
    .replace(/\{\{offer\.description\}\}/g, data.offer?.description || '')
    .replace(/\{\{offer\.price\}\}/g, data.offer?.price || '')
    .replace(/\{\{offer\.validUntil\}\}/g, data.offer?.validUntil ? new Date(data.offer.validUntil).toLocaleDateString() : '')
    .replace(/\{\{payLink\}\}/g, data.payLink || '')
    .replace(/\{\{sender\.firstName\}\}/g, data.sender?.firstName || '')
    .replace(/\{\{sender\.lastName\}\}/g, data.sender?.lastName || '');
}

function renderTemplateBlocks(blocks, data) {
  if (!blocks || blocks.length === 0) return '';

  return blocks.map(block => {
    const content = replacePlaceholders(block.content, data);
    
    switch (block.type) {
      case 'header':
        const fontSize = block.styles?.fontSize || 24;
        const color = block.styles?.color || '#111827';
        const align = block.styles?.align || 'left';
        return `<h1 style="margin:0 0 16px;font-size:${fontSize}px;color:${color};text-align:${align};font-weight:600;">${content}</h1>`;

      case 'text':
        const textColor = block.styles?.color || '#374151';
        const textAlign = block.styles?.align || 'left';
        const textSize = block.styles?.fontSize || 14;
        return `<p style="margin:0 0 16px;font-size:${textSize}px;color:${textColor};text-align:${textAlign};line-height:1.6;">${content}</p>`;

      case 'image':
        const imgUrl = block.settings?.url || '';
        const imgWidth = block.styles?.width || '100%';
        const imgAlt = block.settings?.alt || 'Image';
        if (!imgUrl) return '';
        return `<div style="margin:0 0 16px;text-align:center;"><img src="${imgUrl}" alt="${imgAlt}" style="max-width:${imgWidth};height:auto;border-radius:8px;" /></div>`;

      case 'button':
        const btnText = block.content || 'Click Here';
        const btnUrl = block.settings?.url || '#';
        const btnBg = block.styles?.backgroundColor || '#2563eb';
        const btnColor = block.styles?.color || '#ffffff';
        const btnAlign = block.styles?.align || 'left';
        return `<div style="margin:0 0 16px;text-align:${btnAlign};"><a href="${btnUrl}" style="display:inline-block;background-color:${btnBg};color:${btnColor};text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;">${btnText}</a></div>`;

      case 'divider':
        const lineColor = block.styles?.color || '#e5e7eb';
        const lineThickness = block.styles?.thickness || 1;
        return `<hr style="border:none;border-top:${lineThickness}px solid ${lineColor};margin:0 0 16px;" />`;

      case 'spacer':
        const height = block.settings?.height || 20;
        return `<div style="height:${height}px;margin:0 0 16px;"></div>`;

      case 'offer-details':
        return `
          <div style="margin:0 0 16px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 8px;font-size:16px;color:#111827;">${data.offer?.title || 'Offer Title'}</h3>
            <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.5;">${data.offer?.description || 'Offer description goes here.'}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#111827;"><strong>Price:</strong> $${(data.offer?.price || 0).toLocaleString()}</p>
            <p style="margin:0;font-size:14px;color:#6b7280;"><strong>Valid Until:</strong> ${data.offer?.validUntil ? new Date(data.offer.validUntil).toLocaleDateString() : 'N/A'}</p>
          </div>`;

      case 'payment-link':
        const payUrl = data.payLink || '#';
        const payText = block.content || 'Pay Now';
        const payBg = block.styles?.backgroundColor || '#2563eb';
        const payColor = block.styles?.color || '#ffffff';
        const payAlign = block.styles?.align || 'center';
        return `<div style="margin:0 0 16px;text-align:${payAlign};"><a href="${payUrl}" style="display:inline-block;background-color:${payBg};color:${payColor};text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;">${payText}</a></div>`;

      case 'company-info':
        const compName = data.companyName || 'Super CRM';
        const compLogo = data.companyLogo || '';
        return `
          <div style="margin:0 0 16px;display:flex;align-items:center;gap:12px;">
            ${compLogo ? `<img src="${compLogo}" alt="${compName}" width="48" height="48" style="object-fit:contain;border-radius:8px;" />` : ''}
            <div>
              <h3 style="margin:0;font-size:16px;color:#111827;font-weight:600;">${compName}</h3>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Offer from ${compName}</p>
            </div>
          </div>`;

      default:
        return '';
    }
  }).join('');
}

exports.replacePlaceholders = replacePlaceholders;
exports.renderTemplateBlocks = renderTemplateBlocks;
