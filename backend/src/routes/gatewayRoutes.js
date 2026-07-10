const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
  getGateways, saveGateway, deleteGateway,
  getBankAccounts, saveBankAccount, verifyBankAccount, deleteBankAccount,
  getVendors,
  getCompanyAccounts, saveCompanyAccount, verifyCompanyAccount, deleteCompanyAccount,
  getReleaseReadiness, handleGatewayWebhook,
  getTransactions, retryTransaction,
} = require('../controllers/gatewayController');

// Gateway config
router.get('/',           protect, getGateways);
router.post('/',          protect, saveGateway);
router.delete('/:id',     protect, deleteGateway);

// Vendor capabilities (dynamic bank-account form)
router.get('/vendors',    protect, getVendors);

// Employee bank accounts
router.get('/bank-accounts',          protect, getBankAccounts);
router.post('/bank-accounts',         protect, saveBankAccount);
router.put('/bank-accounts/:id/verify', protect, verifyBankAccount);
router.delete('/bank-accounts/:id',   protect, deleteBankAccount);

// Company source bank accounts (money goes OUT from here)
router.get('/company-accounts',          protect, getCompanyAccounts);
router.post('/company-accounts',         protect, saveCompanyAccount);
router.put('/company-accounts/:id/verify', protect, verifyCompanyAccount);
router.delete('/company-accounts/:id',   protect, deleteCompanyAccount);

// Release readiness check (pre-release validation)
router.get('/runs/:id/readiness',       protect, getReleaseReadiness);

// Gateway webhook (reconcile transaction status from Fawry/PayMob/InstaPay)
router.post('/webhook',                 handleGatewayWebhook);

// Transaction log
router.get('/transactions',           protect, getTransactions);
router.post('/transactions/:id/retry',protect, retryTransaction);

module.exports = router;
