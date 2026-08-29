const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const bdCulture = require('../controllers/bdCultureController');

router.use(protect);

// Overview
router.get('/overview', bdCulture.getOverview);
router.get('/pipeline', bdCulture.getPipeline);

// Opportunities
router.post('/opportunities', bdCulture.createOpportunity);
router.get('/opportunities', bdCulture.getOpportunities);
router.put('/opportunities/:id', bdCulture.updateOpportunity);
router.delete('/opportunities/:id', bdCulture.deleteOpportunity);

// Partnerships
router.post('/partnerships', bdCulture.createPartnership);
router.get('/partnerships', bdCulture.getPartnerships);
router.get('/partnerships/:id', bdCulture.getPartnershipById);
router.put('/partnerships/:id', bdCulture.updatePartnership);

// Partnership Activities
router.get('/partnerships/:id/activities', bdCulture.getPartnershipActivities);
router.post('/partnerships/:id/activities', bdCulture.addPartnershipActivity);

// Benefits
router.post('/benefits', bdCulture.createBenefit);
router.get('/benefits', bdCulture.getBenefits);
router.put('/benefits/:id', bdCulture.updateBenefit);

// Culture Programs
router.post('/culture-programs', bdCulture.createCultureProgram);
router.get('/culture-programs', bdCulture.getCulturePrograms);
router.put('/culture-programs/:id', bdCulture.updateCultureProgram);

// Events
router.post('/events', bdCulture.createEvent);
router.get('/events', bdCulture.getEvents);
router.put('/events/:id', bdCulture.updateEvent);

// Suggestions
router.post('/suggestions', bdCulture.createSuggestion);
router.get('/suggestions', bdCulture.getSuggestions);
router.put('/suggestions/:id/status', bdCulture.updateSuggestionStatus);

// Feedback
router.post('/feedback', bdCulture.createFeedback);
router.get('/feedback', bdCulture.getFeedback);

// Tasks
router.post('/tasks', bdCulture.createTask);
router.get('/tasks', bdCulture.getTasks);
router.put('/tasks/:id', bdCulture.updateTask);

module.exports = router;
