/**
 * gatewayController.js
 * Manages PaymentGateway config and EmployeeBankAccount records
 */

const PaymentGateway     = require('../models/PaymentGateway');
const EmployeeBankAccount = require('../models/EmployeeBankAccount');
const CompanyBankAccount  = require('../models/CompanyBankAccount');
const PaymentTransaction  = require('../models/PaymentTransaction');
const PayrollRun          = require('../models/PayrollRun');
const PayrollEntry        = require('../models/PayrollEntry');
const User               = require('../models/User');
const crypto = require('crypto');
const { encrypt, decrypt, maskAccount } = require('../services/encryption');
const { isLive, LIVE_MODE } = require('../services/disbursementService');
const { VENDOR_CAPABILITIES, validateBankAccount } = require('../services/vendorConfig');

const ADMIN_ROLES = [
  'Super CRM Administrator',
  'HRM System Administrator',
  'HR Director / Executive HR User',
  'HR Manager',
  'Payroll Specialist',
];
const isAdmin = (user) => ADMIN_ROLES.includes(user?.role);

// ─────────────────────────────────────────────────────────────────
// GATEWAY CONFIG
// ─────────────────────────────────────────────────────────────────

// GET all gateways (masked)
exports.getGateways = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const gateways = await PaymentGateway.find()
      .populate('configuredBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    // Return masked versions — never expose raw encrypted strings to frontend
    const masked = gateways.map(g => ({
      _id: g._id,
      provider: g.provider,
      isActive: g.isActive,
      companyAccountName: g.companyAccountName,
      companyBankName: g.companyBankName,
      companyAccountNumber: g.companyAccountNumber ? maskAccount(decrypt(g.companyAccountNumber)) : null,
      companyIBAN: g.companyIBAN ? maskAccount(decrypt(g.companyIBAN)) : null,
      hasApiKey: !!g.apiKey,
      hasApiSecret: !!g.apiSecret,
      hasMerchantCode: !!g.merchantCode,
      hasIntegrationId: !!g.integrationId,
      configuredBy: g.configuredBy,
      updatedBy: g.updatedBy,
      updatedAt: g.updatedAt,
    }));

    res.json({ success: true, data: masked });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// UPSERT gateway config
exports.saveGateway = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });

    const {
      provider, isActive,
      apiKey, apiSecret, merchantCode, integrationId, iframeId, webhookSecret,
      companyAccountName, companyAccountNumber, companyBankName, companyIBAN,
    } = req.body;

    if (!provider) return res.status(400).json({ message: 'provider is required.' });

    const existing = await PaymentGateway.findOne({ provider });
    const update = { isActive: !!isActive, updatedBy: req.user._id };

    // Only update encrypted fields if new value provided (non-empty string)
    if (apiKey)            update.apiKey            = encrypt(apiKey);
    if (apiSecret)         update.apiSecret         = encrypt(apiSecret);
    if (merchantCode)      update.merchantCode      = encrypt(merchantCode);
    if (integrationId)     update.integrationId     = encrypt(integrationId);
    if (iframeId)          update.iframeId          = encrypt(iframeId);
    if (webhookSecret)     update.webhookSecret     = encrypt(webhookSecret);
    if (companyAccountNumber) update.companyAccountNumber = encrypt(companyAccountNumber);
    if (companyIBAN)       update.companyIBAN       = encrypt(companyIBAN);
    if (companyAccountName !== undefined) update.companyAccountName = companyAccountName;
    if (companyBankName !== undefined)    update.companyBankName    = companyBankName;

    let gateway;
    if (existing) {
      gateway = await PaymentGateway.findOneAndUpdate({ provider }, update, { new: true });
    } else {
      gateway = await PaymentGateway.create({ provider, configuredBy: req.user._id, ...update });
    }

    res.json({ success: true, message: `${provider} gateway saved.`, data: { _id: gateway._id, provider: gateway.provider, isActive: gateway.isActive } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE gateway config
exports.deleteGateway = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    await PaymentGateway.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Gateway config deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// EMPLOYEE BANK ACCOUNTS
// ─────────────────────────────────────────────────────────────────

// GET all bank accounts (admin) or own (employee)
exports.getBankAccounts = async (req, res) => {
  try {
    const query = isAdmin(req.user) ? {} : { employeeId: req.user._id };
    const accounts = await EmployeeBankAccount.find(query)
      .populate('employeeId', 'firstName lastName role department')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const masked = accounts.map(a => ({
      _id: a._id,
      employeeId: a.employeeId,
      bankName: a.bankName,
      accountName: a.accountName,
      accountNumber: a.accountNumber ? maskAccount(decrypt(a.accountNumber)) : null,
      iban: a.iban ? maskAccount(decrypt(a.iban)) : null,
      swiftCode: a.swiftCode,
      branchName: a.branchName,
      disbursementMethod: a.disbursementMethod,
      preferredGateway: a.preferredGateway,
      hasFawryMobile: !!a.fawryMobile,
      hasPaymobWallet: !!a.paymobWallet,
      isVerified: a.isVerified,
      verifiedBy: a.verifiedBy,
      verifiedAt: a.verifiedAt,
      updatedAt: a.updatedAt,
    }));

    res.json({ success: true, data: masked });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// UPSERT employee bank account
exports.saveBankAccount = async (req, res) => {
  try {
    const {
      employeeId, bankName, accountName, accountNumber, iban, swiftCode,
      branchName, branchCode, preferredGateway, disbursementMethod,
      fawryMobile, paymobWallet,
    } = req.body;

    // Employees can only update their own; admins can set for anyone
    const targetId = isAdmin(req.user) && employeeId ? employeeId : req.user._id;

    const vendor = preferredGateway || 'Fawry';
    const method = disbursementMethod || 'BankAccount';

    // Enforce the vendor's required fields (Fawry needs X, PayMob needs Y, ...)
    const errors = validateBankAccount({
      vendor, method,
      data: { accountName, bankName, accountNumber, iban, swiftCode, branchCode, fawryMobile, paymobWallet },
    });
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    const update = {
      bankName, accountName, swiftCode, branchName,
      disbursementMethod: method,
      preferredGateway: vendor,
      updatedBy: req.user._id,
      isVerified: false, // reset verification on update
    };

    if (accountNumber) update.accountNumber = encrypt(accountNumber);
    if (iban)          update.iban          = encrypt(iban);
    if (branchCode)    update.branchCode    = encrypt(branchCode);
    if (fawryMobile)   update.fawryMobile   = encrypt(fawryMobile);
    if (paymobWallet)  update.paymobWallet  = encrypt(paymobWallet);

    const existing = await EmployeeBankAccount.findOne({ employeeId: targetId });
    let account;
    if (existing) {
      account = await EmployeeBankAccount.findOneAndUpdate({ employeeId: targetId }, update, { new: true });
    } else {
      account = await EmployeeBankAccount.create({ employeeId: targetId, addedBy: req.user._id, ...update });
    }

    res.json({ success: true, message: 'Bank account saved.', data: { _id: account._id } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Verify a bank account (admin only)
exports.verifyBankAccount = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const account = await EmployeeBankAccount.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    );
    if (!account) return res.status(404).json({ message: 'Bank account not found.' });
    res.json({ success: true, message: 'Bank account verified.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE bank account
exports.deleteBankAccount = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    await EmployeeBankAccount.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bank account deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// TRANSACTION LOG
// ─────────────────────────────────────────────────────────────────

exports.getTransactions = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { runId, status, limit = 100 } = req.query;
    const filter = {};
    if (runId)  filter.payrollRunId = runId;
    if (status) filter.status = status;

    const txns = await PaymentTransaction.find(filter)
      .populate('employeeId', 'firstName lastName role')
      .populate('payrollRunId', 'period type')
      .populate('initiatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Retry a failed transaction
exports.retryTransaction = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const txn = await PaymentTransaction.findById(req.params.id)
      .populate('payrollRunId')
      .populate('payrollEntryId');

    if (!txn) return res.status(404).json({ message: 'Transaction not found.' });
    if (txn.status === 'Success') return res.status(400).json({ message: 'Transaction already succeeded.' });

    const { disburse } = require('../services/disbursementService');
    const EmployeeBankAccount = require('../models/EmployeeBankAccount');
    const PaymentGateway = require('../models/PaymentGateway');

    const bankAccount = await EmployeeBankAccount.findOne({ employeeId: txn.employeeId });
    if (!bankAccount) return res.status(400).json({ message: 'No bank account on file for employee.' });

    const gateway = await PaymentGateway.findOne({ provider: bankAccount.preferredGateway, isActive: true });
    if (!gateway) return res.status(400).json({ message: `No active ${bankAccount.preferredGateway} gateway configured.` });

    const employee = await User.findById(txn.employeeId);
    const orderId = `RETRY-${txn._id}-${Date.now()}`;

    try {
      const CompanyBankAccount = require('../models/CompanyBankAccount');
      const sourceAccount = txn.sourceAccountId ? await CompanyBankAccount.findById(txn.sourceAccountId) : null;
      const mode = (txn.liveMode && LIVE_MODE) ? 'live' : 'simulation';
      const result = await disburse(gateway, bankAccount, txn.amount, orderId, `${employee?.firstName} ${employee?.lastName}`, { mode, sourceAccount });
      txn.status = 'Success';
      txn.gatewayRefId = result.gatewayRefId;
      txn.gatewayOrderId = result.gatewayOrderId;
      txn.gatewayRawResponse = result.gatewayRawResponse;
      txn.failureCode = null;
      txn.failureReason = null;
      txn.attemptCount += 1;
      txn.lastAttemptAt = new Date();
      await txn.save();

      // Update entry status
      const PayrollEntry = require('../models/PayrollEntry');
      await PayrollEntry.findByIdAndUpdate(txn.payrollEntryId, {
        status: 'Paid', paymentRef: result.gatewayRefId, paymentDate: new Date(), failureReason: '',
      });

      res.json({ success: true, message: 'Retry successful.', data: txn });
    } catch (err) {
      txn.status = 'Failed';
      txn.failureReason = err.message;
      txn.attemptCount += 1;
      txn.lastAttemptAt = new Date();
      await txn.save();
      res.status(400).json({ message: `Retry failed: ${err.message}` });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// VENDOR CAPABILITIES — drives the dynamic bank-account form
// Returns each vendor, its supported methods, required fields, and whether
// an active gateway is currently configured for it.
// ─────────────────────────────────────────────────────────────────

exports.getVendors = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const active = await PaymentGateway.find({ isActive: true }).distinct('provider');
    const vendors = Object.entries(VENDOR_CAPABILITIES).map(([key, cap]) => ({
      key,
      label: cap.label,
      description: cap.description,
      methods: cap.methods,
      fields: cap.fields,
      configured: active.includes(key),
    }));
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// COMPANY SOURCE BANK ACCOUNTS (money goes OUT from here)
// ─────────────────────────────────────────────────────────────────

// GET all company accounts (masked)
exports.getCompanyAccounts = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const accounts = await CompanyBankAccount.find()
      .populate('configuredBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ isDefault: -1, createdAt: -1 });

    const masked = accounts.map(a => ({
      _id: a._id,
      nickname: a.nickname,
      bankName: a.bankName,
      branchName: a.branchName,
      accountName: a.accountName,
      accountMasked: a.accountNumber ? maskAccount(decrypt(a.accountNumber)) : null,
      ibanMasked: a.iban ? maskAccount(decrypt(a.iban)) : null,
      swiftCode: a.swiftCode,
      currency: a.currency,
      disbursementProvider: a.disbursementProvider,
      isDefault: a.isDefault,
      isActive: a.isActive,
      monthlyLimit: a.monthlyLimit,
      verifiedBy: a.verifiedBy,
      verifiedAt: a.verifiedAt,
      notes: a.notes,
      configuredBy: a.configuredBy,
      updatedAt: a.updatedAt,
    }));
    res.json({ success: true, data: masked });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// UPSERT company account
exports.saveCompanyAccount = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const {
      _id, nickname, bankName, branchName, branchCode, accountName,
      accountNumber, iban, swiftCode, currency, disbursementProvider,
      monthlyLimit, isDefault, isActive, notes,
    } = req.body;

    if (!nickname || !bankName || !accountName) {
      return res.status(400).json({ message: 'nickname, bankName and accountName are required.' });
    }

    const update = {
      nickname, bankName, branchName, accountName,
      swiftCode: swiftCode || '',
      currency: currency || 'EGP',
      disbursementProvider: disbursementProvider || 'Fawry',
      monthlyLimit: Number(monthlyLimit) || 0,
      isActive: isActive !== undefined ? !!isActive : true,
      isDefault: !!isDefault,
      notes: notes || '',
      configuredBy: req.user._id,
      updatedBy: req.user._id,
    };

    if (accountNumber) update.accountNumber = encrypt(accountNumber);
    if (iban)          update.iban          = encrypt(iban);
    if (branchCode)    update.branchCode    = encrypt(branchCode);

    // Only one default account
    if (update.isDefault) {
      await CompanyBankAccount.updateMany({}, { isDefault: false });
    }

    let account;
    if (_id) {
      account = await CompanyBankAccount.findByIdAndUpdate(_id, update, { new: true });
    } else {
      account = await CompanyBankAccount.create(update);
    }

    res.json({ success: true, message: 'Company bank account saved.', data: { _id: account._id, nickname: account.nickname, isDefault: account.isDefault } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Verify a company account (admin only)
exports.verifyCompanyAccount = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const account = await CompanyBankAccount.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    );
    if (!account) return res.status(404).json({ message: 'Company account not found.' });
    res.json({ success: true, message: 'Company bank account verified.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE company account
exports.deleteCompanyAccount = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    await CompanyBankAccount.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Company bank account deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// RELEASE READINESS CHECK — call before releasing a run
// Returns what's missing / what will happen (live vs simulation).
// ─────────────────────────────────────────────────────────────────

exports.getReleaseReadiness = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found.' });

    const entries = await PayrollEntry.find({ runId: run._id });
    const employees = entries.map(e => e.employeeId);

    const bankAccounts = await EmployeeBankAccount.find({ employeeId: { $in: employees } });
    const byEmp = {};
    bankAccounts.forEach(a => { byEmp[a.employeeId.toString()] = a; });

    const willBeLive = isLive(run.disbursementMode);
    const sourceAccount = run.sourceAccountId ? await CompanyBankAccount.findById(run.sourceAccountId) : null;

    const issues = [];
    let readyToPay = 0;
    let missingBank = 0;
    let unverified = 0;

    if (!sourceAccount) issues.push('No company source bank account linked to this run.');
    else if (!sourceAccount.isActive) issues.push(`Source account "${sourceAccount.nickname}" is inactive.`);

    if (!LIVE_MODE && run.disbursementMode === 'live') {
      issues.push('DISBURSEMENT_LIVE_MODE is not enabled in the server environment — run will be simulated.');
    }

    for (const e of entries) {
      const ba = byEmp[e.employeeId.toString()];
      if (!ba) { missingBank++; continue; }
      if (ba.disbursementMethod === 'BankAccount' && !ba.isVerified) { unverified++; continue; }
      if (!ba.isVerified && ba.disbursementMethod !== 'BankAccount') { unverified++; continue; }
      readyToPay++;
    }

    if (missingBank) issues.push(`${missingBank} employee(s) have no bank account on file.`);
    if (unverified) issues.push(`${unverified} employee bank account(s) are not verified.`);

    const totalToDisburse = entries.reduce((s, e) => s + (e.netSalary || 0), 0);

    res.json({
      success: true,
      data: {
        runId: run._id,
        period: run.period,
        status: run.status,
        disbursementMode: run.disbursementMode,
        willMoveRealMoney: willBeLive && !!sourceAccount,
        liveModeEnabledGlobally: LIVE_MODE,
        sourceAccount: sourceAccount ? { _id: sourceAccount._id, nickname: sourceAccount.nickname, bankName: sourceAccount.bankName, provider: sourceAccount.disbursementProvider } : null,
        headcount: entries.length,
        readyToPay,
        missingBank,
        unverified,
        totalToDisburse,
        issues,
        ready: issues.length === 0 && willBeLive && !!sourceAccount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GATEWAY WEBHOOK — reconcile transaction status from gateway callbacks
// Expects: { provider, gatewayRefId? | gatewayOrderId?, status, signature? }
// status maps to: SUCCESS | FAILED | REVERSED
// ─────────────────────────────────────────────────────────────────

const WEBHOOK_STATUS_MAP = {
  SUCCESS: 'Success',
  PAID: 'Success',
  COMPLETED: 'Success',
  FAILED: 'Failed',
  REJECTED: 'Failed',
  REVERSED: 'Reversed',
  REFUNDED: 'Refunded',
};

exports.handleGatewayWebhook = async (req, res) => {
  try {
    const { provider, gatewayRefId, gatewayOrderId, status, signature } = req.body;

    if (!provider) return res.status(400).send('provider required');
    const gateway = await PaymentGateway.findOne({ provider });
    if (!gateway) return res.status(404).send('unknown provider');

    // Optional signature check (when gateway.webhookSecret is set)
    if (gateway.webhookSecret && signature) {
      const secret = decrypt(gateway.webhookSecret);
      const expected = crypto.createHash('sha256').update(`${gatewayRefId || gatewayOrderId}:${status}:${secret}`).digest('hex');
      if (expected !== signature) return res.status(401).send('invalid signature');
    }

    const mapped = WEBHOOK_STATUS_MAP[String(status).toUpperCase()];
    if (!mapped) return res.status(400).send('unknown status');

    const filter = gatewayRefId ? { gatewayRefId } : { gatewayOrderId };
    const txn = await PaymentTransaction.findOne(filter);
    if (!txn) return res.status(404).send('transaction not found');

    txn.status = mapped;
    txn.webhookRawResponse = req.body;
    txn.webhookReceivedAt = new Date();
    if (mapped === 'Success') {
      txn.paymentConfirmedAt = new Date();
      // Reflect on the payroll entry
      const PayrollEntry = require('../models/PayrollEntry');
      await PayrollEntry.findByIdAndUpdate(txn.payrollEntryId, { status: 'Paid' });
    } else if (mapped === 'Failed' || mapped === 'Reversed') {
      const PayrollEntry = require('../models/PayrollEntry');
      await PayrollEntry.findByIdAndUpdate(txn.payrollEntryId, { status: 'Failed', failureReason: `Gateway webhook: ${status}` });
    }
    await txn.save();

    res.status(200).json({ success: true, status: mapped });
  } catch (err) {
    res.status(500).send('webhook error');
  }
};
