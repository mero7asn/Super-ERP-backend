/**
 * essRoutes.js
 * Employee Self-Service (ESS) — private, per-user endpoints.
 * Mounted at: /api/ess
 * All routes require protect + enforceSelfScope (no client employeeId accepted).
 */
const express = require('express');
const router = express.Router();
const { protect, enforceSelfScope } = require('../middleware/auth');
const {
  getMySchedule,
  getMyPayslips,
  getMyPayslipById,
  getMyPaymentHistory,
} = require('../controllers/essController');
const {
  submitPaymentMethod,
  getMyPaymentMethods,
  deletePaymentMethod,
  updatePaymentMethod,
} = require('../controllers/paymentMethodController');

const self = [protect, enforceSelfScope];

router.get('/schedule', self, getMySchedule);
router.get('/payroll/payslips', self, getMyPayslips);
router.get('/payroll/payslips/:id', self, getMyPayslipById);
router.get('/payroll/history', self, getMyPaymentHistory);

// Payment Methods (ESS)
router.get('/payment-methods', self, getMyPaymentMethods);
router.post('/payment-methods', self, submitPaymentMethod);
router.put('/payment-methods/:id', self, updatePaymentMethod);
router.delete('/payment-methods/:id', self, deletePaymentMethod);

module.exports = router;
