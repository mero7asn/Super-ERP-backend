const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const uploadGovDoc = require('../middleware/uploadHRM');
const { uploadSignedContract: signedContractUpload } = require('../middleware/uploadHRM');

const {
  sendEmail,
  getInbox,
  getSent,
  getEmailThread,
  markEmailRead,
  upsertContract,
  uploadSignedContract,
  upsertSalaryComponent,
  deleteSalaryComponent,
  updateNetSalaryOnly,
  getContracts,
  getMyContract,
  updateGovDocs,
  uploadGovDocFile,
  verifyGovDoc,
  getGovDocTemplates,
  createGovDocTemplate,
  deleteGovDocTemplate,
  getLeaveBalance,
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveStatus,
  getDetailedSchedule,
  updateDetailedSchedule,
  createTraining,
  getTrainings,
  updateTrainingReport,
  updateAuxStatus,
  getTeamAux,
  updateRtmFlag,
  createVacancy,
  getVacancies,
  createCandidate,
  getCandidates,
  updateCandidateStatus,
  addCandidateFeedback,
  createKPI,
  getKPIs,
  createPartnership,
  getPartnerships,
  createSuggestion,
  getSuggestions,
  updateSuggestionStatus,
  getAuxReport,
  upsertAuxSchedule,
  getAuxSchedules
} = require('../controllers/hrmController');

// --- Emails ---
router.post('/emails', protect, sendEmail);
router.get('/emails/inbox', protect, getInbox);
router.get('/emails/sent', protect, getSent);
router.get('/emails/:id/thread', protect, getEmailThread);
router.put('/emails/:id/read', protect, markEmailRead);

// --- Contracts & Salaries ---
router.post('/contracts', protect, upsertContract);
router.post('/contracts/signed-copy', protect, signedContractUpload.single('contractFile'), uploadSignedContract);
router.post('/contracts/salary-components', protect, upsertSalaryComponent);
router.delete('/contracts/salary-components/:id', protect, deleteSalaryComponent);
router.put('/contracts/salary/:id', protect, updateNetSalaryOnly);
router.get('/contracts', protect, getContracts);
router.get('/contracts/my', protect, getMyContract);
router.post('/contracts/gov-docs', protect, updateGovDocs);
router.post('/contracts/gov-docs/upload', protect, uploadGovDoc.single('docFile'), uploadGovDocFile);
router.put('/contracts/gov-docs/:id/verify', protect, verifyGovDoc);

// --- Gov Doc Templates (Super Admin) ---
router.get('/gov-doc-templates', protect, getGovDocTemplates);
router.post('/gov-doc-templates', protect, createGovDocTemplate);
router.delete('/gov-doc-templates/:id', protect, deleteGovDocTemplate);

// --- Leave Requests & Shifts ---
router.get('/leaves/balance/:employeeId', protect, getLeaveBalance);
router.get('/leaves/balance', protect, getLeaveBalance);
router.post('/leaves', protect, createLeaveRequest);
router.get('/leaves', protect, getLeaveRequests);
router.put('/leaves/:id/status', protect, updateLeaveStatus);
router.get('/schedules/detailed', protect, getDetailedSchedule);
router.put('/schedules/detailed', protect, updateDetailedSchedule);

// --- Trainings & AUX Status ---
router.post('/trainings', protect, createTraining);
router.get('/trainings', protect, getTrainings);
router.put('/trainings/:id', protect, updateTrainingReport);
router.put('/aux', protect, updateAuxStatus);
router.get('/aux/team', protect, getTeamAux);
router.put('/aux/rtm-flag', protect, updateRtmFlag);
router.get('/aux/report', protect, getAuxReport);
router.post('/aux/schedule', protect, upsertAuxSchedule);
router.get('/aux/schedule', protect, getAuxSchedules);

// --- Talent Acquisition ---
router.post('/vacancies', protect, createVacancy);
router.get('/vacancies', protect, getVacancies);
router.post('/candidates', protect, createCandidate);
router.get('/candidates', protect, getCandidates);
router.put('/candidates/:id/status', protect, updateCandidateStatus);
router.post('/candidates/:id/feedback', protect, addCandidateFeedback);
router.post('/candidates/:id/notes', protect, addCandidateFeedback); // alias

// --- KPIs ---
router.post('/kpis', protect, createKPI);
router.get('/kpis', protect, getKPIs);

// --- Partnerships & Suggestions ---
router.post('/partnerships', protect, createPartnership);
router.get('/partnerships', protect, getPartnerships);
router.post('/suggestions', protect, createSuggestion);
router.get('/suggestions', protect, getSuggestions);
router.put('/suggestions/:id/status', protect, updateSuggestionStatus);
router.put('/suggestions/:id', protect, updateSuggestionStatus); // alias

module.exports = router;
