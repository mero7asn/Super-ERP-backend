// Notification service — delivers in-app notifications (workspace inbox)
// and a best-effort console log. The workspace inbox is modelled as an
// internal Email record (recipientId) so employees see notifications on
// the "Emails" / notifications view without any external provider.

const Email = require('../models/Email');
const User = require('../models/User');

/**
 * Notify an employee via an internal (in-app) message that lands in their
 * workspace inbox. `senderId` is the acting user; `recipientId` the employee.
 */
const notifyEmployee = async ({ senderId, recipientId, subject, body, htmlBody }) => {
  try {
    const recipient = await User.findById(recipientId).select('email firstName');
    if (!recipient) return null;

    const email = await Email.create({
      senderId: senderId || recipientId,
      recipientId,
      subject,
      body,
      htmlBody: htmlBody || null,
      fromEmail: null,
      toEmail: recipient.email,
      status: 'sent',
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 WORKSPACE NOTIFICATION');
    console.log('To:', recipient.email, `(${recipient.firstName})`);
    console.log('Subject:', subject);
    console.log('Body:', body);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return email;
  } catch (err) {
    console.error('notifyEmployee failed:', err.message);
    return null;
  }
};

const sendEmail = async (to, subject, body) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 EMAIL SENT');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Body:', body);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return new Promise(resolve => setTimeout(resolve, 100));
};

const sendSMS = async (to, message) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💬 SMS SENT');
  console.log('To:', to);
  console.log('Message:', message);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return new Promise(resolve => setTimeout(resolve, 100));
};

module.exports = { sendEmail, sendSMS, notifyEmployee };

