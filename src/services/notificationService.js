// Simple notification service for email/SMS
// TODO: Replace with actual service integrations (SendGrid, Twilio, AWS SES/SNS, etc.)

const sendEmail = async (to, subject, body) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 EMAIL SENT');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Body:', body);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // Simulate async operation
  return new Promise(resolve => setTimeout(resolve, 100));
};

const sendSMS = async (to, message) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💬 SMS SENT');
  console.log('To:', to);
  console.log('Message:', message);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // Simulate async operation
  return new Promise(resolve => setTimeout(resolve, 100));
};

module.exports = { sendEmail, sendSMS };
