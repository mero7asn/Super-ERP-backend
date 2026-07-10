/**
 * payrollRoutes.js
 * Enterprise Payroll AI Agents — Route Definitions
 * Mounted at: /api/payroll
 */

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');

const {
  getPayrollRuns,
  generatePayrollRun,
  approvePayrollRun,
  releasePayrollRun,
  getRunEntries,
  getDisbursementQueue,
  retryDisbursement,
  getMyPayslips,
  getLoans,
  createLoan,
  updateLoan,
  getAlerts,
  updateAlertStatus,
  getAnalytics,
  personalAgentQuery,
  managerAgentQuery,
} = require('../controllers/payrollController');

const {
  getAllPaymentMethods,
  approvePaymentMethod,
  rejectPaymentMethod,
} = require('../controllers/paymentMethodController');

// ─── Payroll Runs ────────────────────────────────────────────────
router.get('/runs',              protect, getPayrollRuns);
router.post('/runs',             protect, generatePayrollRun);
router.put('/runs/:id/approve',  protect, approvePayrollRun);
router.put('/runs/:id/release',  protect, releasePayrollRun);
router.get('/runs/:id/entries',  protect, getRunEntries);
router.get('/disbursement-queue',         protect, getDisbursementQueue);
router.put('/entries/:id/retry',          protect, retryDisbursement);

// ─── Payslips ────────────────────────────────────────────────────
router.get('/entries/my',        protect, getMyPayslips);

// ─── Loans ───────────────────────────────────────────────────────
router.get('/loans',             protect, getLoans);
router.post('/loans',            protect, createLoan);
router.put('/loans/:id',         protect, updateLoan);

// ─── Alerts ──────────────────────────────────────────────────────
router.get('/alerts',            protect, getAlerts);
router.put('/alerts/:id/status', protect, updateAlertStatus);

// ─── Analytics ───────────────────────────────────────────────────
router.get('/analytics',         protect, getAnalytics);

// ─── AI Agents ───────────────────────────────────────────────────
router.post('/agent/personal',   protect, personalAgentQuery);
router.post('/agent/manager',    protect, managerAgentQuery);

// ─── Payment Methods (Manager) ───────────────────────────────────
router.get('/payment-methods',              protect, getAllPaymentMethods);
router.put('/payment-methods/:id/approve',  protect, approvePaymentMethod);
router.put('/payment-methods/:id/reject',   protect, rejectPaymentMethod);

module.exports = router;
