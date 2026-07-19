const SystemSetting = require('../models/SystemSetting');
const { encrypt, decrypt } = require('../services/encryption');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private - Super Admin only
exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({});
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private - Super Admin only
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      const setting = await SystemSetting.findOneAndUpdate(
        { key },
        { value, updatedBy: req.user._id },
        { new: true, upsert: true }
      );
      results.push(setting);
    }

    const settingsMap = {};
    results.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({ success: true, data: settingsMap });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get email settings
// @route   GET /api/settings/email
// @access  Private - Super Admin only
exports.getEmailSettings = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'email' });
    const data = setting ? { ...setting.value } : {};
    delete data.smtpPass;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update email settings
// @route   PUT /api/settings/email
// @access  Private - Super Admin only
exports.updateEmailSettings = async (req, res) => {
  try {
    const emailSettings = { ...req.body };

    if (emailSettings.smtpHost !== undefined && !String(emailSettings.smtpHost).trim()) {
      return res.status(400).json({ message: 'SMTP host cannot be empty' });
    }
    if (emailSettings.smtpUser !== undefined && !String(emailSettings.smtpUser).trim()) {
      return res.status(400).json({ message: 'SMTP user cannot be empty' });
    }
    if (emailSettings.smtpPass !== undefined && !String(emailSettings.smtpPass).trim()) {
      return res.status(400).json({ message: 'SMTP password cannot be empty' });
    }

    if (emailSettings.smtpPass) {
      emailSettings.smtpPass = encrypt(emailSettings.smtpPass);
    }

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'email' },
      {
        value: emailSettings,
        updatedBy: req.user._id
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: setting.value });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Test global SMTP connection
// @route   POST /api/settings/email/test
// @access  Private - Super Admin only
exports.testEmailSettings = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'email' });
    if (!setting || !setting.value) {
      return res.status(400).json({ success: false, message: 'Global SMTP is not configured' });
    }

    const nodemailer = require('nodemailer');
    const cfg = setting.value;
    const smtpPass = decrypt(cfg.smtpPass);

    if (!smtpPass) {
      return res.status(400).json({ message: 'SMTP password is missing' });
    }

    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort || 587,
      secure: cfg.smtpSecure || false,
      auth: { user: cfg.smtpUser, pass: smtpPass },
      family: 4, // Force IPv4
    });

    try {
      await transporter.verify();
      res.json({ success: true, message: 'SMTP connection verified successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Default AUX configuration
const DEFAULT_AUX_CONFIG = {
  availableAuxes: [
    { name: 'Break',    enabled: true, timingMode: 'fixed',    defaultMinutes: 15,   color: '#6366F1', icon: '🟣' },
    { name: 'Lunch',    enabled: true, timingMode: 'fixed',    defaultMinutes: 30,   color: '#F97316', icon: '🍽️' },
    { name: 'Coaching', enabled: true, timingMode: 'flexible', defaultMinutes: null, color: '#3B82F6', icon: '🔵' },
    { name: 'Training', enabled: true, timingMode: 'flexible', defaultMinutes: null, color: '#F59E0B', icon: '🟡' },
    { name: 'Other',    enabled: true, timingMode: 'flexible', defaultMinutes: null, color: '#64748B', icon: '⚪' },
  ]
};

// @desc    Get AUX configuration (all authenticated users)
// @route   GET /api/settings/aux
exports.getAuxConfig = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'auxConfig' });
    const data = setting ? setting.value : DEFAULT_AUX_CONFIG;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update AUX configuration
// @route   PUT /api/settings/aux
// @access  Private - Super Admin only
exports.updateAuxConfig = async (req, res) => {
  try {
    const { availableAuxes } = req.body;
    if (!Array.isArray(availableAuxes)) {
      return res.status(400).json({ message: 'availableAuxes must be an array' });
    }
    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'auxConfig' },
      { value: { availableAuxes }, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: setting.value });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
