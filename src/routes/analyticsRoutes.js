const express = require('express');
const router = express.Router();
const { getSystemAnalytics, getMarketingPerformance } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// Only allow these specific high-level roles
const analyticsRoles = ['CRM core Administrator', 'Core 360 Administrator', 'Executive User', 'Business Analyst', 'System Architect'];

router.get('/', protect, authorizeRoles(...analyticsRoles), getSystemAnalytics);
router.get('/marketing-performance', protect, authorizeRoles(...analyticsRoles), getMarketingPerformance);

module.exports = router;
