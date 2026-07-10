/**
 * encryption.js
 * AES-256-GCM encryption for sensitive fields (API keys, bank accounts)
 * Key is derived from ENCRYPTION_SECRET in .env
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.scryptSync(
  process.env.ENCRYPTION_SECRET || 'super-crm-default-secret-change-in-prod',
  'salt',
  32
);

const encrypt = (plaintext) => {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return null;
  }
};

// Mask account number — show only last 4 digits
const maskAccount = (account) => {
  if (!account) return null;
  const str = String(account);
  return '*'.repeat(Math.max(0, str.length - 4)) + str.slice(-4);
};

module.exports = { encrypt, decrypt, maskAccount };
