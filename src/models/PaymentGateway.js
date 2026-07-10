const mongoose = require('mongoose');

const paymentGatewaySchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['Fawry', 'PayMob', 'InstaPay', 'BankAPI', 'Amazon'],
    required: true,
    unique: true,
  },
  isActive: { type: Boolean, default: false },

  // Encrypted fields — stored as AES-256-GCM ciphertext
  apiKey:       { type: String, default: null }, // encrypted
  apiSecret:    { type: String, default: null }, // encrypted
  merchantCode: { type: String, default: null }, // encrypted (Fawry merchant code)
  integrationId:{ type: String, default: null }, // encrypted (PayMob integration id)
  iframeId:     { type: String, default: null }, // PayMob iframe id (less sensitive, still encrypted)

  // Company source bank account (the account money goes OUT from)
  companyAccountName:   { type: String, default: '' },
  companyAccountNumber: { type: String, default: null }, // encrypted
  companyBankName:      { type: String, default: '' },
  companyIBAN:          { type: String, default: null }, // encrypted

  // Webhook / callback URL for gateway to notify us
  webhookSecret: { type: String, default: null }, // encrypted

  // Audit
  configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PaymentGateway', paymentGatewaySchema);
