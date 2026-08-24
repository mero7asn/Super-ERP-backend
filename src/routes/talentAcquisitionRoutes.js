const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ta = require('../controllers/talentAcquisitionController');

// All routes require authentication
router.use(protect);

// Job Requisitions
router.post('/requisitions', ta.createJobRequisition);
router.get('/requisitions', ta.getJobRequisitions);
router.get('/requisitions/:id', ta.getJobRequisitionById);
router.put('/requisitions/:id', ta.updateJobRequisition);
router.put('/requisitions/:id/status', ta.updateRequisitionStatus);
router.post('/requisitions/:id/convert', ta.convertRequisitionToJob);

// Jobs
router.post('/jobs', ta.createJob);
router.get('/jobs', ta.getJobs);
router.get('/jobs/:id', ta.getJobById);
router.put('/jobs/:id', ta.updateJob);
router.put('/jobs/:id/status', ta.updateJobStatus);

// Job Descriptions
router.post('/job-descriptions', ta.createJobDescription);
router.get('/job-descriptions', ta.getJobDescriptions);
router.put('/job-descriptions/:id', ta.updateJobDescription);

// Job Publications
router.post('/publications', ta.createJobPublication);
router.get('/publications', ta.getJobPublications);
router.put('/publications/:id', ta.updateJobPublication);

// Candidates & Applications
router.post('/candidates', ta.createCandidate);
router.get('/candidates', ta.getCandidates);
router.put('/applications/:id/status', ta.updateApplicationStatus);

// Interviews
router.post('/interviews', ta.scheduleInterview);
router.get('/interviews', ta.getInterviews);
router.post('/interviews/:id/feedback', ta.submitInterviewFeedback);

// Offers
router.post('/offers', ta.createOffer);
router.get('/offers', ta.getOffers);
router.put('/offers/:id/status', ta.updateOfferStatus);

// Analytics & Reports
router.get('/overview', ta.getTalentAcquisitionOverview);
router.get('/funnel', ta.getRecruitmentFunnel);
router.get('/activity', ta.getRecruitmentActivity);

module.exports = router;
