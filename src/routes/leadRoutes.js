const express = require('express');
const router = express.Router();
const { getLeads, createLead, updateLead, getAssignableAgents, getLeadDistribution } = require('../controllers/leadController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/agents', getAssignableAgents);
router.get('/distribution', getLeadDistribution);
router.route('/').get(getLeads).post(createLead);
router.route('/:id').put(updateLead);

module.exports = router;
