const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBusinessModel,
  updateBusinessModel,
  getEmailSettings,
  updateEmailSettings,
  testEmailSettings,
  getBrandingConfig,
  updateBrandingConfig,
  uploadBrandingLogo,
  getErpConfig,
  updateErpConfig,
} = require('../controllers/settingsController');
const uploadBranding = require('../middleware/uploadBranding');

router.get('/business-model', protect, getBusinessModel);
router.put('/business-model', protect, updateBusinessModel);

router.get('/email', protect, getEmailSettings);
router.put('/email', protect, updateEmailSettings);
router.post('/email/test', protect, testEmailSettings);

router.get('/branding', protect, getBrandingConfig);
router.put('/branding', protect, updateBrandingConfig);
router.post('/branding/logo', protect, uploadBranding.single('logo'), uploadBrandingLogo);

router.get('/erp', protect, getErpConfig);
router.put('/erp', protect, updateErpConfig);

module.exports = router;
