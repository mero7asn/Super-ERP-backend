const express = require('express');
const router = express.Router();
const {
  getSystemAnalytics,
  getMarketingPerformance,
  getHrmAnalytics,
  getAccountingAnalytics,
  getSupplyChainAnalytics
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const CRM_ANALYTICS_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator', 'Sales Manager',
  'Customer Support Manager', 'Marketing Manager', 'Operations Manager',
  'Executive User', 'Business Analyst', 'System Architect'
];

const HRM_ANALYTICS_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator', 'HRM System Administrator',
  'HR Manager', 'HR Director / Executive HR User', 'HR Business Partner',
  'Executive User', 'Business Analyst', 'System Architect'
];

const FINANCE_ANALYTICS_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator', 'Accountant',
  'Finance Manager', 'Executive User', 'Business Analyst', 'System Architect'
];

const SUPPLY_ANALYTICS_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator', 'Supply Chain Manager',
  'Procurement Manager', 'Inventory Manager', 'Warehouse Manager',
  'Executive User', 'Business Analyst', 'System Architect'
];

router.get('/', protect, authorizeRoles(...CRM_ANALYTICS_ROLES), getSystemAnalytics);
router.get('/marketing-performance', protect, authorizeRoles(...CRM_ANALYTICS_ROLES), getMarketingPerformance);
router.get('/hrm', protect, authorizeRoles(...HRM_ANALYTICS_ROLES), getHrmAnalytics);
router.get('/accounting', protect, authorizeRoles(...FINANCE_ANALYTICS_ROLES), getAccountingAnalytics);
router.get('/supply-chain', protect, authorizeRoles(...SUPPLY_ANALYTICS_ROLES), getSupplyChainAnalytics);

module.exports = router;
