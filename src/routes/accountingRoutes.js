const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const acController = require('../controllers/accountingController');

router.use(protect);

// --- Financial Dashboard KPIs ---
router.get('/kpis', acController.getFinancialDashboardKpis);

// --- Chart of Accounts (COA) ---
router.get('/accounts', acController.getChartOfAccounts);
router.post('/accounts', acController.createAccount);

// --- Double-Entry Journal Ledger ---
router.get('/journals', acController.getJournalEntries);
router.post('/journals', acController.createJournalEntry);
router.post('/journals/:id/reverse', acController.reverseJournalEntry);

// --- Accounts Receivable (AR) ---
router.get('/invoices/customer', acController.getCustomerInvoices);
router.post('/invoices/customer', acController.createCustomerInvoice);

// --- Accounts Payable (AP) ---
router.get('/invoices/supplier', acController.getSupplierInvoices);
router.post('/invoices/supplier', acController.createSupplierInvoice);

// --- Fixed Assets ---
router.get('/fixed-assets', acController.getFixedAssets);
router.post('/fixed-assets', acController.createFixedAsset);

// --- Financial Reports & Traceability ---
router.get('/reports/trial-balance', acController.getTrialBalanceReport);
router.get('/reports/profit-loss', acController.getProfitAndLossReport);
router.get('/traceability/:sourceId', acController.getTraceability);

module.exports = router;
