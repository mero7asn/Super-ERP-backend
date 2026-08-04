const SystemSetting = require('../models/SystemSetting');
const { getGlobalEmailConfig, verifyTransporter, sendRawEmail } = require('../services/emailService');
const { encrypt } = require('../services/encryption');

const BUSINESS_MODELS = ['service', 'product', 'both'];

// @desc    Get the platform business model (service | product | both)
// @route   GET /api/settings/business-model
// @access  Private (Super Admin only)
exports.getBusinessModel = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const setting = await SystemSetting.findOne({ key: 'businessModel' });
    res.json({ success: true, data: { businessModel: setting?.value || 'service' } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Set the platform business model (service | product | both)
// @route   PUT /api/settings/business-model
// @access  Private (Super Admin only)
exports.updateBusinessModel = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { businessModel } = req.body;
    if (!businessModel || !BUSINESS_MODELS.includes(businessModel)) {
      return res.status(400).json({ message: 'Valid business model is required (service, product, both).' });
    }

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'businessModel' },
      { key: 'businessModel', value: businessModel, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    // If the acting user is the Super Admin, mark them as onboarded.
    const User = require('../models/User');
    const isSuperAdmin = req.user.role === 'Super CRM Administrator';
    let onboarded = false;
    if (isSuperAdmin) {
      await User.findByIdAndUpdate(req.user._id, { onboarded: true });
      onboarded = true;
    }

    res.json({ success: true, data: { businessModel: setting.value, onboarded } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get global SMTP / email settings
// @route   GET /api/settings/email
// @access  Private (Super Admin only)
exports.getEmailSettings = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const cfg = await getGlobalEmailConfig();
    // Never return the decrypted password to the client.
    res.json({ success: true, data: cfg ? { ...cfg, smtpPass: cfg.smtpPass ? '********' : '' } : null });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save global SMTP / email settings
// @route   PUT /api/settings/email
// @access  Private (Super Admin only)
exports.updateEmailSettings = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;
    const existing = await SystemSetting.findOne({ key: 'email' });
    const value = existing?.value || {};
    if (smtpHost !== undefined) value.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) value.smtpPort = Number(smtpPort) || 587;
    if (smtpSecure !== undefined) value.smtpSecure = !!smtpSecure;
    if (smtpUser !== undefined) value.smtpUser = smtpUser || null;
    if (smtpPass) {
      value.smtpPass = encrypt(smtpPass);
    }

    await SystemSetting.findOneAndUpdate(
      { key: 'email' },
      { key: 'email', value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Global email settings saved.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get platform branding settings (company name and logo)
// @route   GET /api/settings/branding
// @access  Private (Super Admin only)
exports.getBrandingConfig = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const setting = await SystemSetting.findOne({ key: 'branding' });
    res.json({ success: true, data: setting?.value || { companyName: 'Core 360', companyLogo: '' } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save platform branding settings (company name and logo)
// @route   PUT /api/settings/branding
// @access  Private (Super Admin only)
exports.updateBrandingConfig = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { companyName, companyLogo } = req.body;
    const value = {
      companyName: String(companyName || '').trim() || 'Core 360',
      companyLogo: String(companyLogo || '').trim()
    };

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'branding' },
      { key: 'branding', value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Branding settings saved.', data: setting.value });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Upload company logo
// @route   POST /api/settings/branding/logo
// @access  Private (Super Admin only)
exports.uploadBrandingLogo = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No logo file uploaded.' });
    }

    const mimeType = req.file.mimetype || 'image/png';
    const base64 = req.file.buffer.toString('base64');
    const logoUrl = `data:${mimeType};base64,${base64}`;

    const existing = await SystemSetting.findOne({ key: 'branding' });
    const currentValue = existing?.value || {};
    const value = {
      companyName: currentValue.companyName || 'Core 360',
      companyLogo: logoUrl
    };

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'branding' },
      { key: 'branding', value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Logo uploaded successfully.', data: setting.value });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload logo', error: error.message });
  }
};

// @desc    Get the ERP integration config (base URL for external departments)
// @route   GET /api/settings/erp
// @access  Private (Super Admin only)
exports.getErpConfig = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const setting = await SystemSetting.findOne({ key: 'erp' });
    res.json({ success: true, data: setting?.value || { baseUrl: '' } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getTelephonyConfig = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const setting = await SystemSetting.findOne({ key: 'telephony' });
    const value = setting?.value || { provider: 'avaya' };
    res.json({ success: true, data: {
      provider: value.provider || 'avaya',
      serverUrl: value.serverUrl || '',
      username: value.username || '',
      extension: value.extension || '',
      password: value.password ? '********' : '',
    } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateTelephonyConfig = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { provider, serverUrl, username, password, extension } = req.body || {};
    if (!['avaya', 'cisco', 'sip'].includes(String(provider || '').toLowerCase())) {
      return res.status(400).json({ message: 'Select a valid telephony provider.' });
    }

    const value = {
      provider: String(provider).toLowerCase(),
      serverUrl: String(serverUrl || '').trim(),
      username: String(username || '').trim(),
      extension: String(extension || '').trim(),
    };
    if (password) {
      value.password = password;
    }
    await SystemSetting.findOneAndUpdate(
      { key: 'telephony' },
      { key: 'telephony', value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Telephony provider saved.', data: value });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save the ERP integration config
// @route   PUT /api/settings/erp
// @access  Private (Super Admin only)
exports.updateErpConfig = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const { baseUrl } = req.body;
    const value = { baseUrl: (baseUrl || '').trim() };
    await SystemSetting.findOneAndUpdate(
      { key: 'erp' },
      { key: 'erp', value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    res.json({ success: true, message: 'ERP integration settings saved.', data: value });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Test the global SMTP connection by sending a probe email
// @route   POST /api/settings/email/test
// @access  Private (Super Admin only)
exports.testEmailSettings = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const cfg = await getGlobalEmailConfig();
    if (!cfg || !cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
      return res.status(400).json({ success: false, message: 'SMTP is not configured.' });
    }

    const user = await require('../models/User').findById(req.user._id);
    const verify = await verifyTransporter(user, cfg);
    if (!verify.success) {
      return res.status(400).json({ success: false, message: verify.message });
    }

    // Send a probe email to the admin's own address.
    try {
      await sendRawEmail({
        to: user.email,
        subject: 'Core 360 — SMTP Connection Test',
        text: 'This is a test message confirming your global SMTP relay is working.',
      });
    } catch (sendErr) {
      return res.status(400).json({ success: false, message: `SMTP verified but send failed: ${sendErr.message}` });
    }

    res.json({ success: true, message: 'SMTP connection verified and test email sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get minimum price settings + discount override flag
// @route   GET /api/settings/pricing
// @access  Private (Super Admin only)
exports.getPricingSettings = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const [minOffer, minProduct, discountOverride] = await Promise.all([
      SystemSetting.findOne({ key: 'offerPriceMin' }),
      SystemSetting.findOne({ key: 'productPriceMin' }),
      SystemSetting.findOne({ key: 'discountOverride' }),
    ]);
    const offerPriceMin = minOffer?.value ?? 0;
    const productPriceMin = minProduct?.value ?? 0;
    const discountOverrideValue = discountOverride?.value ?? false;
    res.json({
      success: true,
      data: {
        offerPriceMin,
        productPriceMin,
        discountOverride: discountOverrideValue,
        minOfferPrice: offerPriceMin,
        minProductPrice: productPriceMin,
        allowDiscountOverride: discountOverrideValue,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save minimum price settings + discount override flag
// @route   PUT /api/settings/pricing
// @access  Private (Super Admin only)
exports.updatePricingSettings = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const {
      offerPriceMin,
      productPriceMin,
      discountOverride,
      minOfferPrice,
      minProductPrice,
      allowDiscountOverride,
    } = req.body;
    const resolvedOfferPriceMin = offerPriceMin ?? minOfferPrice ?? 0;
    const resolvedProductPriceMin = productPriceMin ?? minProductPrice ?? 0;
    const resolvedDiscountOverride = discountOverride ?? allowDiscountOverride ?? false;
    const updates = [
      { key: 'offerPriceMin', value: Number(resolvedOfferPriceMin) >= 0 ? Number(resolvedOfferPriceMin) : 0 },
      { key: 'productPriceMin', value: Number(resolvedProductPriceMin) >= 0 ? Number(resolvedProductPriceMin) : 0 },
      { key: 'discountOverride', value: !!resolvedDiscountOverride },
    ];

    await Promise.all(
      updates.map((u) =>
        SystemSetting.findOneAndUpdate({ key: u.key }, { key: u.key, value: u.value, updatedBy: req.user._id }, { new: true, upsert: true })
      )
    );

    res.json({ success: true, message: 'Pricing settings saved.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get currencies list + default currency
// @route   GET /api/settings/currencies
// @access  Private
exports.getCurrencies = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'currencies' });
    const defaultSetting = await SystemSetting.findOne({ key: 'defaultCurrency' });
    const currencies = Array.isArray(setting?.value)
      ? setting.value
          .filter((c) => c && c.code)
          .map((c) => ({
            code: String(c.code).trim().toUpperCase(),
            name: String(c.name || c.code).trim(),
            symbol: String(c.symbol || '').trim(),
            rate: Number(c.rate) || 0,
          }))
      : [];
    res.json({
      success: true,
      data: {
        currencies,
        defaultCurrency: defaultSetting?.value || 'USD',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save currencies list + default currency (Super Admin only)
// @route   PUT /api/settings/currencies
// @access  Private (Super Admin only)
exports.updateCurrencies = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { currencies, defaultCurrency } = req.body;
    const normalizedCurrencies = Array.isArray(currencies)
      ? currencies
          .filter((c) => c && c.code && c.name)
          .map((c) => ({
            code: String(c.code).trim().toUpperCase(),
            name: String(c.name).trim(),
            symbol: String(c.symbol || '').trim(),
            rate: Number(c.rate) || 0,
          }))
      : [];
    const uniqueCurrencies = [];
    const seen = new Set();
    normalizedCurrencies.forEach((currency) => {
      if (!currency.code || seen.has(currency.code)) return;
      seen.add(currency.code);
      uniqueCurrencies.push(currency);
    });

    await Promise.all([
      SystemSetting.findOneAndUpdate({ key: 'currencies' }, { key: 'currencies', value: uniqueCurrencies, updatedBy: req.user._id }, { new: true, upsert: true }),
      SystemSetting.findOneAndUpdate({ key: 'defaultCurrency' }, { key: 'defaultCurrency', value: defaultCurrency || 'USD', updatedBy: req.user._id }, { new: true, upsert: true }),
    ]);

    res.json({ success: true, message: 'Currencies saved.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Apply discount to an offer
// @route   POST /api/offers/:id/discount
// @access  Private (Sales Manager or above, or offer creator if override allowed)
exports.applyDiscount = async (req, res) => {
  try {
    const { discountType, discountValue } = req.body;
    const offer = await Offer.findById(req.params.id).populate('createdBy', 'role');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isManager = req.user.role === 'Sales Manager';
    const isCreator = offer.createdBy._id.toString() === req.user._id.toString();

    if (!isAdmin && !isManager && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to discount this offer' });
    }

    const discountOverride = await SystemSetting.findOne({ key: 'discountOverride' });
    const allowOverride = discountOverride?.value ?? false;

    const minPriceSetting = await SystemSetting.findOne({ key: offer.offerType === 'Product' ? 'productPriceMin' : 'offerPriceMin' });
    const minPrice = minPriceSetting?.value ?? 0;

    const value = Number(discountValue);
    if (!discountType || !['Percentage', 'Fixed'].includes(discountType) || Number.isNaN(value) || value < 0) {
      return res.status(400).json({ message: 'Valid discount type and value are required' });
    }

    let finalPrice = offer.price;
    if (discountType === 'Percentage') {
      finalPrice = offer.price - (offer.price * (value / 100));
    } else {
      finalPrice = offer.price - value;
    }

    if (finalPrice < minPrice && !allowOverride) {
      return res.status(400).json({
        message: `Final price (${finalPrice.toFixed(2)}) is below minimum allowed (${minPrice.toFixed(2)}).`,
        hint: 'Super admin must enable discount override to allow lower prices.',
      });
    }

    offer.originalPrice = offer.price;
    offer.finalPrice = Math.max(0, finalPrice);
    offer.discountType = discountType;
    offer.discountValue = value;
    offer.discountAppliedBy = req.user._id;
    offer.discountAppliedAt = new Date();
    await offer.save();

    const populated = await offer.populate('createdBy', 'firstName lastName role');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Remove a currency by code
// @route   DELETE /api/settings/currencies/:code
// @access  Private (Super Admin only)
exports.deleteCurrency = async (req, res) => {
  try {
    if (!['Super CRM Administrator', 'System Architect'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const setting = await SystemSetting.findOne({ key: 'currencies' });
    const current = Array.isArray(setting?.value) ? setting.value : [];
    const code = String(req.params.code || '').trim().toUpperCase();
    const next = current.filter((c) => String(c.code || '').trim().toUpperCase() !== code);
    if (next.length === current.length) {
      return res.status(404).json({ message: 'Currency not found' });
    }
    await SystemSetting.findOneAndUpdate({ key: 'currencies' }, { key: 'currencies', value: next, updatedBy: req.user._id }, { new: true, upsert: true });
    res.json({ success: true, message: 'Currency removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
