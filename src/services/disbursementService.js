/**
 * disbursementService.js
 * ----------------------------------------------------------------------------
 * REAL gateway integrations for payroll payouts in Egypt (EGP).
 *
 * Supported destinations per employee:
 *   - BankAccount  -> real bank transfer (Fawry bank disbursement / PayMob
 *                     bank payout / InstaPay IPN / direct bank API)
 *   - FawryWallet  -> Fawry mobile-wallet disbursement
 *   - PayMobWallet -> PayMob wallet/card payout
 *
 * SAFETY: A run only moves REAL money when BOTH:
 *   1. process.env.DISBURSEMENT_LIVE_MODE === 'true'   (global kill-switch)
 *   2. The payroll run's `disbursementMode` === 'live'  (per-run override)
 * Otherwise every call is SIMULATED and returns a fake success reference —
 * no network request to the gateway, no funds moved.
 *
 * All credentials are stored AES-256-GCM encrypted in Mongo and decrypted
 * here just-in-time. Never logged.
 * ----------------------------------------------------------------------------
 */

const axios = require('axios');
const crypto = require('crypto');
const { decrypt } = require('./encryption');

// ─────────────────────────────────────────────────────────────────
// CONFIG / SAFETY
// ─────────────────────────────────────────────────────────────────

// Global kill-switch. Real funds are ONLY moved when this is 'true'.
const LIVE_MODE = process.env.DISBURSEMENT_LIVE_MODE === 'true';

// Provider endpoint config
const FAWRY_BASE_URL = process.env.FAWRY_ENV === 'production'
  ? 'https://www.atfawry.com/ECommerceWeb/Fawry/payments'
  : 'https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments';

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

// InstaPay / IPN (Egyptian instant bank transfer). Each bank exposes its own
// IPN endpoint; configure the base URL + credentials via env/CompanyBankAccount.
const INSTAPAY_BASE_URL = process.env.INSTAPAY_BASE_URL || '';

const REQUEST_TIMEOUT = 30000;

const isLive = (requestedMode) => LIVE_MODE && requestedMode === 'live';

// ─────────────────────────────────────────────────────────────────
// SIMULATION (default — no real money moves)
// ─────────────────────────────────────────────────────────────────

const simulateDisbursement = (gateway, bankAccount, amount, orderId) => {
  const ref = `SIM-${gateway.provider}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  return {
    simulated: true,
    gatewayRefId: ref,
    gatewayOrderId: orderId,
    gatewayRawResponse: {
      simulated: true,
      note: 'No funds were moved. Set DISBURSEMENT_LIVE_MODE=true and run mode=live to execute real transfers.',
      amount,
      method: bankAccount.disbursementMethod || 'BankAccount',
      provider: gateway.provider,
    },
  };
};

// ─────────────────────────────────────────────────────────────────
// FAWRY
// ─────────────────────────────────────────────────────────────────

const fawrySignature = (merchantCode, orderId, amount, apiSecret) => {
  const amountStr = Number(amount).toFixed(2);
  const signatureStr = `${merchantCode}${orderId}${amountStr}${apiSecret}`;
  return crypto.createHash('sha256').update(signatureStr).digest('hex');
};

const disburseFawryWallet = async (gateway, bankAccount, amount, orderId, description) => {
  const merchantCode = decrypt(gateway.merchantCode);
  const apiSecret    = decrypt(gateway.apiSecret);
  const mobile       = decrypt(bankAccount.fawryMobile);

  if (!merchantCode || !apiSecret) throw new Error('Fawry: merchantCode or apiSecret not configured.');
  if (!mobile) throw new Error('Fawry: employee Fawry mobile number not set.');

  const amountStr = Number(amount).toFixed(2);
  const signature = fawrySignature(merchantCode, orderId, amount, apiSecret);

  const payload = {
    merchantCode,
    merchantRefNum: orderId,
    paymentMethod: 'MOBILEWALLETS',
    amount: amountStr,
    currencyCode: 'EGP',
    description,
    customerMobile: mobile,
    signature,
  };

  const { data } = await axios.post(`${FAWRY_BASE_URL}/disbursement`, payload, {
    headers: { 'Content-Type': 'application/json' }, timeout: REQUEST_TIMEOUT,
  });

  if (data.statusCode !== 200 && data.type !== 'PaymentStatusResponse') {
    throw new Error(`Fawry error: ${data.statusDescription || JSON.stringify(data)}`);
  }
  return {
    gatewayRefId: String(data.referenceNumber || data.fawryRefNumber || ''),
    gatewayOrderId: orderId,
    gatewayRawResponse: data,
  };
};

/**
 * Fawry BANK ACCOUNT disbursement.
 * Routes salary to the employee's real bank account (account number / IBAN).
 * Requires the Fawry corporate disbursement product; field names follow the
 * Fawry disbursement-to-bank spec. Adjust `paymentMethod` to the contracted
 * product (e.g. 'BANKACCOUNT', 'MEEZACARD') if your agreement differs.
 */
const disburseFawryBank = async (gateway, bankAccount, amount, orderId, description) => {
  const merchantCode = decrypt(gateway.merchantCode);
  const apiSecret    = decrypt(gateway.apiSecret);
  const accountNumber = decrypt(bankAccount.accountNumber);
  const iban          = decrypt(bankAccount.iban);

  if (!merchantCode || !apiSecret) throw new Error('Fawry: merchantCode or apiSecret not configured.');
  if (!accountNumber && !iban) throw new Error('Fawry: employee bank account or IBAN not set.');

  const amountStr = Number(amount).toFixed(2);
  const signature = fawrySignature(merchantCode, orderId, amount, apiSecret);

  const payload = {
    merchantCode,
    merchantRefNum: orderId,
    paymentMethod: 'BANKACCOUNT',
    amount: amountStr,
    currencyCode: 'EGP',
    description,
    customerName: bankAccount.accountName,
    bankAccount: accountNumber || undefined,
    iban: iban || undefined,
    bankCode: bankAccount.swiftCode || undefined,
    signature,
  };

  const { data } = await axios.post(`${FAWRY_BASE_URL}/disbursement`, payload, {
    headers: { 'Content-Type': 'application/json' }, timeout: REQUEST_TIMEOUT,
  });

  if (data.statusCode !== 200 && data.type !== 'PaymentStatusResponse') {
    throw new Error(`Fawry bank error: ${data.statusDescription || JSON.stringify(data)}`);
  }
  return {
    gatewayRefId: String(data.referenceNumber || data.fawryRefNumber || ''),
    gatewayOrderId: orderId,
    gatewayRawResponse: data,
  };
};

// ─────────────────────────────────────────────────────────────────
// PAYMOB PAYOUTS
// ─────────────────────────────────────────────────────────────────

const getPayMobToken = async (apiKey) => {
  const res = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, { api_key: apiKey }, { timeout: 15000 });
  if (!res.data?.token) throw new Error('PayMob: failed to obtain auth token.');
  return res.data.token;
};

const disbursePayMobWallet = async (gateway, bankAccount, amount, orderId, employeeName) => {
  const apiKey        = decrypt(gateway.apiKey);
  const integrationId = decrypt(gateway.integrationId);
  const wallet        = decrypt(bankAccount.paymobWallet);

  if (!apiKey || !integrationId) throw new Error('PayMob: apiKey or integrationId not configured.');
  if (!wallet) throw new Error('PayMob: employee PayMob wallet number not set.');

  const token = await getPayMobToken(apiKey);
  const amountCents = Math.round(Number(amount) * 100);

  const orderRes = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
    auth_token: token,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: 'EGP',
    merchant_order_id: orderId,
    items: [{ name: 'Salary Disbursement', amount_cents: amountCents, quantity: 1 }],
  }, { timeout: 15000 });

  const paymobOrderId = orderRes.data?.id;
  if (!paymobOrderId) throw new Error('PayMob: failed to create order.');

  const keyRes = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
    auth_token: token,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: paymobOrderId,
    billing_data: {
      first_name: employeeName.split(' ')[0] || 'Employee',
      last_name: employeeName.split(' ').slice(1).join(' ') || 'N/A',
      email: 'payroll@company.com',
      phone_number: wallet,
      apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA',
      shipping_method: 'NA', postal_code: 'NA', city: 'Cairo', country: 'EG', state: 'Cairo',
    },
    currency: 'EGP',
    integration_id: Number(integrationId),
  }, { timeout: 15000 });

  const paymentToken = keyRes.data?.token;
  if (!paymentToken) throw new Error('PayMob: failed to obtain payment key.');

  const payRes = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payments/pay`, {
    source: { identifier: wallet, subtype: 'WALLET' },
    payment_token: paymentToken,
  }, { timeout: REQUEST_TIMEOUT });

  const txn = payRes.data;
  if (txn?.success !== true) throw new Error(`PayMob payout failed: ${txn?.data?.message || JSON.stringify(txn)}`);

  return {
    gatewayRefId: String(txn?.id || txn?.transaction_id || ''),
    gatewayOrderId: String(paymobOrderId),
    gatewayRawResponse: txn,
  };
};

/**
 * PayMob BANK ACCOUNT payout.
 * Uses the PayMob payouts `bank_account` destination to credit the employee's
 * real bank account. Requires an approved PayMob payout profile + bank payout
 * integration id configured on the gateway.
 */
const disbursePayMobBank = async (gateway, bankAccount, amount, orderId, employeeName) => {
  const apiKey        = decrypt(gateway.apiKey);
  const integrationId = decrypt(gateway.integrationId);
  const accountNumber = decrypt(bankAccount.accountNumber);
  const iban          = decrypt(bankAccount.iban);

  if (!apiKey) throw new Error('PayMob: apiKey not configured.');
  if (!accountNumber && !iban) throw new Error('PayMob: employee bank account or IBAN not set.');

  const token = await getPayMobToken(apiKey);

  const payload = {
    auth_token: token,
    amount: Number(amount),
    currency: 'EGP',
    merchant_order_id: orderId,
    receiver: {
      name: bankAccount.accountName || employeeName,
      account_number: accountNumber || undefined,
      iban: iban || undefined,
      bank_name: bankAccount.bankName || undefined,
      swift_code: bankAccount.swiftCode || undefined,
    },
    payout_method: 'bank_account',
    payout_profile_id: integrationId ? Number(integrationId) : undefined,
  };

  const { data } = await axios.post(`${PAYMOB_BASE_URL}/payouts`, payload, { timeout: REQUEST_TIMEOUT });

  if (!data?.id && data?.success !== true) {
    throw new Error(`PayMob bank payout failed: ${data?.message || JSON.stringify(data)}`);
  }
  return {
    gatewayRefId: String(data?.id || data?.reference_number || ''),
    gatewayOrderId: orderId,
    gatewayRawResponse: data,
  };
};

// ─────────────────────────────────────────────────────────────────
// INSTAPAY / IPN (Egyptian instant bank transfer)
// ----------------------------------------------------------------------------
// InstaPay (IPN) moves EGP between bank accounts in real time using the
// creditor's IBAN (or mobile). The DEBTOR is the company source account.
// Each bank exposes its own IPN endpoint + credentials; configure
// INSTAPAY_BASE_URL and the company account credentials on the gateway.
// This is the most direct route to a REAL employee bank account in Egypt.
// ─────────────────────────────────────────────────────────────────

const disburseInstaPay = async (gateway, bankAccount, amount, orderId, employeeName, sourceAccount) => {
  if (!INSTAPAY_BASE_URL) throw new Error('InstaPay: INSTAPAY_BASE_URL not configured.');
  const apiKey  = decrypt(gateway.apiKey);
  const apiUser = decrypt(gateway.merchantCode);
  const iban    = decrypt(bankAccount.iban) || decrypt(bankAccount.accountNumber);
  const debtorIban = sourceAccount ? decrypt(sourceAccount.iban) || decrypt(sourceAccount.accountNumber) : null;

  if (!apiKey) throw new Error('InstaPay: apiKey not configured.');
  if (!iban) throw new Error('InstaPay: employee IBAN not set.');
  if (!debtorIban) throw new Error('InstaPay: company source account IBAN not set.');

  const payload = {
    debtor:  { iban: debtorIban },
    creditor: { iban, name: bankAccount.accountName || employeeName },
    amount: Number(amount),
    currency: 'EGP',
    reference: orderId,
    description: 'Payroll disbursement',
  };

  const { data } = await axios.post(`${INSTAPAY_BASE_URL}/transfers`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Api-User': apiUser || '',
    },
    timeout: REQUEST_TIMEOUT,
  });

  return {
    gatewayRefId: String(data?.transactionId || data?.id || ''),
    gatewayOrderId: orderId,
    gatewayRawResponse: data,
  };
};

// ─────────────────────────────────────────────────────────────────
// UNIFIED DISBURSE
// ─────────────────────────────────────────────────────────────────

/**
 * @param {object} gatewayDoc      - PaymentGateway mongoose doc (encrypted fields)
 * @param {object} bankAccount     - EmployeeBankAccount mongoose doc
 * @param {number} amount          - net salary in EGP
 * @param {string} orderId         - unique reference (e.g. PAY-2025-07-EMP123)
 * @param {string} employeeName
 * @param {object} [opts]
 * @param {string} [opts.mode='simulation'] - 'live' | 'simulation'
 * @param {object} [opts.sourceAccount]    - CompanyBankAccount doc (for bank transfers)
 */
const disburse = async (gatewayDoc, bankAccount, amount, orderId, employeeName, opts = {}) => {
  const mode = opts.mode || 'simulation';
  const method = bankAccount.disbursementMethod || 'BankAccount';
  const provider = bankAccount.preferredGateway || gatewayDoc.provider;

  // SAFETY GATE — if not explicitly live, simulate.
  if (!isLive(mode)) {
    return simulateDisbursement(gatewayDoc, bankAccount, amount, orderId);
  }

  if (method === 'FawryWallet') {
    if (provider !== 'Fawry') throw new Error('FawryWallet requires Fawry gateway.');
    return disburseFawryWallet(gatewayDoc, bankAccount, amount, orderId, `Salary ${employeeName}`);
  }
  if (method === 'PayMobWallet') {
    if (provider !== 'PayMob') throw new Error('PayMobWallet requires PayMob gateway.');
    return disbursePayMobWallet(gatewayDoc, bankAccount, amount, orderId, employeeName);
  }

  // Real bank-account transfer
  if (provider === 'Fawry') {
    return disburseFawryBank(gatewayDoc, bankAccount, amount, orderId, `Salary ${employeeName}`);
  }
  if (provider === 'PayMob') {
    return disbursePayMobBank(gatewayDoc, bankAccount, amount, orderId, employeeName);
  }
  if (provider === 'InstaPay') {
    return disburseInstaPay(gatewayDoc, bankAccount, amount, orderId, employeeName, opts.sourceAccount);
  }
  if (provider === 'BankAPI') {
    // Direct bank API (CBE/NBE/QNB/CIB corporate agreement). Wire per-bank here.
    throw new Error('BankAPI direct disbursement not yet configured for this bank. Use Fawry/PayMob/InstaPay.');
  }
  throw new Error(`Unsupported disbursement provider: ${provider}`);
};

module.exports = { disburse, isLive, LIVE_MODE };
