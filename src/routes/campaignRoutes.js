const express = require('express');
const router = express.Router();
const { getCampaigns, createCampaign, updateCampaign, deleteCampaign } = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const MARKETING_ROLES = [
  'Super CRM Administrator', 'Marketing Specialist',
  'Marketing Manager', 'Executive User', 'Business Analyst', 'System Architect'
];

router.get('/', protect, authorizeRoles(...MARKETING_ROLES), getCampaigns);
router.post('/', protect, authorizeRoles('Super CRM Administrator', 'Marketing Specialist', 'Marketing Manager', 'System Architect'), createCampaign);
router.put('/:id', protect, authorizeRoles('Super CRM Administrator', 'Marketing Specialist', 'Marketing Manager', 'System Architect'), updateCampaign);
router.delete('/:id', protect, authorizeRoles('Super CRM Administrator', 'Marketing Manager', 'System Architect'), deleteCampaign);

module.exports = router;
