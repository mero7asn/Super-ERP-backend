const express = require('express');
const router = express.Router();
const { getLeads, getLeadById, createLead, updateLead, addLeadNote, getAssignableAgents, getLeadDistribution } = require('../controllers/leadController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/agents', getAssignableAgents);
router.get('/distribution', getLeadDistribution);
router.route('/').get(getLeads).post(createLead);
router.route('/:id').get(getLeadById).put(updateLead);
router.post('/:id/notes', addLeadNote);

module.exports = router;
