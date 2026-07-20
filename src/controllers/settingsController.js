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
    res.json({ success: true, data: setting?.value || { companyName: 'Super CRM', companyLogo: '' } });
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
      companyName: String(companyName || '').trim() || 'Super CRM',
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
        subject: 'Super ERP — SMTP Connection Test',
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
