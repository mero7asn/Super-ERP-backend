const SystemSetting = require('../models/SystemSetting');
const { decrypt } = require('./encryption');

const createTransporter = async (user, globalConfig = null) => {
  const nodemailer = require('nodemailer');
  let host, port, secure, authUser, authPass, fallbackName;

  if (user && user.smtpHost && user.smtpUser) {
    const smtpPass = typeof user.getSmtpPass === 'function' ? user.getSmtpPass() : user.smtpPass;
    if (!smtpPass) return null;
    host = user.smtpHost;
    port = user.smtpPort || 587;
    secure = user.smtpSecure || false;
    authUser = user.smtpUser;
    authPass = smtpPass;
    fallbackName = null;
  } else if (globalConfig && globalConfig.smtpHost && globalConfig.smtpUser && globalConfig.smtpPass) {
    host = globalConfig.smtpHost;
    port = globalConfig.smtpPort || 587;
    secure = globalConfig.smtpSecure || false;
    authUser = globalConfig.smtpUser;
    authPass = globalConfig.smtpPass;
    fallbackName = 'Global SMTP';
  } else {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: authUser,
      pass: authPass,
    },
    family: 4, // Force IPv4 to prevent IPv6 ENETUNREACH issues
  });
};

const sendEmail = async (user, options, globalConfig = null) => {
  const transporter = await createTransporter(user, globalConfig);
  if (!transporter) {
    throw new Error('SMTP is not configured for this user and no global SMTP relay is available');
  }

  const branding = await getBrandingConfig();
  const fromName = branding.companyName || 'Super CRM';
  let fromAddress;
  let replyTo;

  if (user.smtpHost && user.smtpUser) {
    fromAddress = user.smtpUser;
  } else if (globalConfig && globalConfig.smtpHost && globalConfig.smtpUser) {
    fromAddress = user.email;
    replyTo = user.email;
  } else {
    fromAddress = user.email;
  }

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text,
  };

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const verifyTransporter = async (user, globalConfig = null) => {
  const transporter = await createTransporter(user, globalConfig);
  if (!transporter) {
    return { success: false, message: 'SMTP is not configured for this user and no global SMTP relay is available' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const getGlobalEmailConfig = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'email' });
    if (!setting || !setting.value) return null;
    const cfg = { ...setting.value };
    if (cfg.smtpPass) {
      cfg.smtpPass = decrypt(cfg.smtpPass);
    }
    return cfg;
  } catch (error) {
    console.error('Failed to load global email settings:', error);
    return null;
  }
};

const getBrandingConfig = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'branding' });
    return setting?.value || { companyName: 'Super CRM', companyLogo: '' };
  } catch (error) {
    console.error('Failed to load branding settings:', error);
    return { companyName: 'Super CRM', companyLogo: '' };
  }
};

// Send an email without an authenticated user (e.g. public payment confirmations).
// Uses the global SMTP relay; falls back to the provided fromAddress.
const sendRawEmail = async ({ to, subject, text, html, fromAddress, fromName }) => {
  const cfg = await getGlobalEmailConfig();
  if (!cfg || !cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
    throw new Error('Global SMTP is not configured; cannot send system email.');
  }

  const branding = fromName ? null : await getBrandingConfig();
  const fromLabel = fromName ? fromName.trim() : (branding?.companyName || 'Super CRM');
  const fromHeader = fromAddress
    ? `"${fromLabel}" <${fromAddress}>`
    : `"${fromLabel}" <${cfg.smtpUser}>`;

  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort || 587,
    secure: cfg.smtpSecure || false,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    family: 4,
  });

  const info = await transport.sendMail({
    from: fromHeader,
    to,
    subject,
    text,
    html: html || text,
  });

  return info;
};

module.exports = { sendEmail, verifyTransporter, createTransporter, getGlobalEmailConfig, getBrandingConfig, sendRawEmail };
