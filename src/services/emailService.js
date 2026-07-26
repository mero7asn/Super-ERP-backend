const SystemSetting = require('../models/SystemSetting');
const { decrypt } = require('./encryption');

const getActiveEmailConfig = (user, globalConfig) => {
  if (globalConfig && globalConfig.smtpHost && globalConfig.smtpUser && globalConfig.smtpPass) {
    return { source: 'global', config: globalConfig };
  }
  if (user && user.smtpHost && user.smtpUser) {
    const smtpPass = typeof user.getSmtpPass === 'function' ? user.getSmtpPass() : user.smtpPass;
    if (smtpPass) {
      return { source: 'user', config: { smtpHost: user.smtpHost, smtpPort: user.smtpPort || 587, smtpSecure: user.smtpSecure || false, smtpUser: user.smtpUser, smtpPass } };
    }
  }
  return { source: null, config: null };
};

const createTransporter = async (user, globalConfig = null) => {
  const nodemailer = require('nodemailer');
  const { config } = getActiveEmailConfig(user, globalConfig);
  if (!config) return null;

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpSecure || false,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    family: 4,
  });
};

const sendEmail = async (user, options, globalConfig = null) => {
  const transporter = await createTransporter(user, globalConfig);
  if (!transporter) {
    throw new Error('SMTP is not configured for this user and no global SMTP relay is available');
  }

  const { source, config: activeConfig } = getActiveEmailConfig(user, globalConfig);
  console.log(`[email] sendEmail using ${source} config: from=${activeConfig ? activeConfig.smtpUser : user.email} to=${options.to}`);
  const branding = await getBrandingConfig();
  const fromName = branding.companyName || 'Super CRM';
  const fromAddress = activeConfig ? activeConfig.smtpUser : user.email;

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text,
  };

  if (options.cc) {
    mailOptions.cc = options.cc;
  }
  if (options.bcc) {
    mailOptions.bcc = options.bcc;
  }

  const replyTo = options.replyTo || user?.email;
  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  if (options.attachments && options.attachments.length > 0) {
    mailOptions.attachments = options.attachments.map(att => {
      const base64Data = att.url ? att.url.replace(/^data:[^;]+;base64,/, '') : null;
      if (att.cid) {
        return {
          filename: att.filename || 'image.png',
          cid: att.cid,
          content: att.content || (base64Data ? Buffer.from(base64Data, 'base64') : Buffer.from('')),
          contentType: att.contentType || 'image/png',
        };
      }
      return {
        filename: att.filename || att.name || 'attachment',
        content: att.content || (base64Data ? Buffer.from(base64Data, 'base64') : Buffer.from('')),
        contentType: att.contentType || att.type || 'application/octet-stream',
      };
    });
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const verifyTransporter = async (user, globalConfig = null) => {
  const { source, config } = getActiveEmailConfig(user, globalConfig);
  if (!config) {
    return { success: false, message: 'SMTP is not configured for this user and no global SMTP relay is available' };
  }
  console.log(`[email] verifyTransporter using ${source} config: host=${config.smtpHost} user=${config.smtpUser}`);

  try {
    const transporter = await createTransporter(user, globalConfig);
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
const sendRawEmail = async ({ to, subject, text, html, fromAddress, fromName, attachments }) => {
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
    ...(attachments && attachments.length > 0 ? {
      attachments: attachments.map(att => {
        const base64Data = att.url ? att.url.replace(/^data:[^;]+;base64,/, '') : null;
        if (att.cid) {
          return {
            filename: att.filename || 'image.png',
            cid: att.cid,
            content: att.content || (base64Data ? Buffer.from(base64Data, 'base64') : Buffer.from('')),
            contentType: att.contentType || 'image/png',
          };
        }
        return {
          filename: att.filename || att.name || 'attachment',
          content: att.content || (base64Data ? Buffer.from(base64Data, 'base64') : Buffer.from('')),
          contentType: att.contentType || att.type || 'application/octet-stream',
        };
      })
    } : {})
  });

  return info;
};

module.exports = { sendEmail, verifyTransporter, createTransporter, getGlobalEmailConfig, getBrandingConfig, sendRawEmail };
