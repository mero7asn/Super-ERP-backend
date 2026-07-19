const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const {
  getSettings,
  updateSettings,
  getEmailSettings,
  updateEmailSettings,
  testEmailSettings,
  getAuxConfig,
  updateAuxConfig,
} = require('../controllers/settingsController');

// AUX config is readable by all authenticated users (needed by agents to see available AUXes)
router.get('/aux', protect, getAuxConfig);
// AUX config updates are admin-only
router.put('/aux', protect, authorizeRoles('Super CRM Administrator', 'System Architect'), updateAuxConfig);

// All other settings routes require Super Admin or System Architect
router.use(protect);
router.use(authorizeRoles('Super CRM Administrator', 'System Architect'));

router.get('/', getSettings);
router.put('/', updateSettings);

// Email settings
router.get('/email', getEmailSettings);
router.put('/email', updateEmailSettings);
router.post('/email/test', testEmailSettings);

module.exports = router;
