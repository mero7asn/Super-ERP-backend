const express = require('express');
const router = express.Router();
const { getCampaigns, createCampaign, updateCampaign, deleteCampaign } = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const MARKETING_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator', 'Marketing Specialist',
  'Marketing Manager', 'Executive User', 'Business Analyst', 'System Architect'
];

const CAMPAIGN_MUTATE_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator', 'Marketing Specialist',
  'Marketing Manager', 'System Architect', 'Executive User'
];

const CAMPAIGN_DELETE_ROLES = [
  'Super CRM Administrator', 'Super Admin', 'Administrator',
  'CRM core Administrator', 'Core 360 Administrator',
  'Marketing Manager', 'System Architect', 'Executive User'
];

router.get('/', protect, authorizeRoles(...MARKETING_ROLES), getCampaigns);
router.post('/', protect, authorizeRoles(...CAMPAIGN_MUTATE_ROLES), createCampaign);
router.put('/:id', protect, authorizeRoles(...CAMPAIGN_MUTATE_ROLES), updateCampaign);
router.delete('/:id', protect, authorizeRoles(...CAMPAIGN_DELETE_ROLES), deleteCampaign);

module.exports = router;
