const JobRequisition = require('../models/JobRequisition');
const Job = require('../models/Job');
const JobDescription = require('../models/JobDescription');
const JobPublication = require('../models/JobPublication');
const Candidate = require('../models/Candidate');
const CandidateApplication = require('../models/CandidateApplication');
const Interview = require('../models/Interview');
const RecruitmentOffer = require('../models/RecruitmentOffer');
const RecruitmentActivity = require('../models/RecruitmentActivity');
const User = require('../models/User');

// Helper to log activity
const logActivity = async (entityType, entityId, action, description, userId, metadata = {}) => {
  try {
    await RecruitmentActivity.create({
      entityType,
      entityId,
      action,
      description,
      performedBy: userId,
      metadata
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

// Check if user has TA permissions
const hasTAPermissions = (user) => {
  return ['Recruitment Specialist (Talent Acquisition)', 'HRM System Administrator', 'HR Manager', 'CRM core Administrator', 'Super Admin', 'Super CRM Administrator'].includes(user?.role);
};

const hasApprovalPermissions = (user) => {
  return ['HRM System Administrator', 'HR Manager', 'CRM core Administrator', 'Super Admin', 'Super CRM Administrator', 'HR Director / Executive HR User'].includes(user?.role);
};

// ==========================================
// JOB REQUISITIONS
// ==========================================

exports.createJobRequisition = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const requisition = await JobRequisition.create({
      ...req.body,
      requestedBy: req.body.requestedBy || req.user._id,
      taOwner: req.user._id
    });

    await logActivity('JobRequisition', requisition._id, 'Created', `Job requisition ${requisition.requisitionId} created`, req.user._id);

    res.status(201).json({ success: true, data: requisition });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getJobRequisitions = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, department, priority, search } = req.query;
    const filter = {};

    if (status) filter.approvalStatus = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { positionTitle: { $regex: search, $options: 'i' } },
        { requisitionId: { $regex: search, $options: 'i' } }
      ];
    }

    const requisitions = await JobRequisition.find(filter)
      .populate('requestedBy', 'firstName lastName role')
      .populate('hiringManager', 'firstName lastName role')
      .populate('taOwner', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requisitions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getJobRequisitionById = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const requisition = await JobRequisition.findById(req.params.id)
      .populate('requestedBy', 'firstName lastName role email')
      .populate('hiringManager', 'firstName lastName role email')
      .populate('taOwner', 'firstName lastName role email')
      .populate('convertedJobId');

    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found.' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJobRequisition = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const requisition = await JobRequisition.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found.' });
    }

    await logActivity('JobRequisition', requisition._id, 'Updated', `Requisition ${requisition.requisitionId} updated`, req.user._id);

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRequisitionStatus = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, comments } = req.body;
    const requisition = await JobRequisition.findById(req.params.id);

    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found.' });
    }

    requisition.approvalStatus = status;
    requisition.approvalHistory.push({
      action: status,
      actionBy: req.user._id,
      comments: comments || ''
    });

    await requisition.save();

    await logActivity('JobRequisition', requisition._id, status, `Requisition ${requisition.requisitionId} status changed to ${status}`, req.user._id);

    res.json({ success: true, data: requisition });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.convertRequisitionToJob = async (req, res) => {
  try {
    if (!hasApprovalPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const requisition = await JobRequisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found.' });
    }

    // Create job from requisition
    const job = await Job.create({
      requisitionId: requisition._id,
      title: requisition.positionTitle,
      department: requisition.department,
      hiringManager: requisition.hiringManager,
      employmentType: requisition.employmentType,
      location: requisition.location,
      salaryRange: requisition.salaryRange,
      numberOfPositions: requisition.numberOfEmployees,
      priority: requisition.priority,
      skills: requisition.requiredSkills,
      status: 'Draft',
      createdBy: req.user._id
    });

    // Update requisition
    requisition.approvalStatus = 'Converted to Job';
    requisition.convertedJobId = job._id;
    await requisition.save();

    await logActivity('Job', job._id, 'Created', `Job ${job.jobId} created from requisition ${requisition.requisitionId}`, req.user._id);
    await logActivity('JobRequisition', requisition._id, 'Converted', `Requisition ${requisition.requisitionId} converted to job ${job.jobId}`, req.user._id);

    res.json({ success: true, data: { job, requisition } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// JOBS
// ==========================================

exports.createJob = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const job = await Job.create({
      ...req.body,
      createdBy: req.user._id
    });

    await logActivity('Job', job._id, 'Created', `Job ${job.jobId} created: ${job.title}`, req.user._id);

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, department, priority, search, isInternal, isExternal } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    if (isInternal !== undefined) filter.isInternal = isInternal === 'true';
    if (isExternal !== undefined) filter.isExternal = isExternal === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { jobId: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(filter)
      .populate('hiringManager', 'firstName lastName role')
      .populate('recruiter', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const job = await Job.findById(req.params.id)
      .populate('hiringManager', 'firstName lastName role email')
      .populate('recruiter', 'firstName lastName role email')
      .populate('jobDescription')
      .populate('requisitionId');

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Get related data
    const [applications, interviews, publications] = await Promise.all([
      CandidateApplication.find({ job: job._id }).populate('candidate', 'fullName email phone status'),
      Interview.find({ job: job._id }).populate('interviewer', 'firstName lastName').populate('candidate', 'fullName'),
      JobPublication.find({ job: job._id })
    ]);

    res.json({
      success: true,
      data: {
        job,
        applications,
        interviews,
        publications
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    await logActivity('Job', job._id, 'Updated', `Job ${job.jobId} updated`, req.user._id);

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    job.status = status;
    if (status === 'Open' && !job.publishedAt) {
      job.publishedAt = new Date();
    }
    await job.save();

    await logActivity('Job', job._id, 'Status Changed', `Job ${job.jobId} status changed to ${status}`, req.user._id);

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// JOB DESCRIPTIONS
// ==========================================

exports.createJobDescription = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const jd = await JobDescription.create({
      ...req.body,
      createdBy: req.user._id
    });

    // Link to job if provided
    if (req.body.job) {
      await Job.findByIdAndUpdate(req.body.job, { jobDescription: jd._id });
    }

    await logActivity('Job', req.body.job, 'JD Created', `Job description created for ${jd.title}`, req.user._id);

    res.status(201).json({ success: true, data: jd });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJobDescription = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const jd = await JobDescription.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!jd) {
      return res.status(404).json({ message: 'Job description not found.' });
    }

    res.json({ success: true, data: jd });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getJobDescriptions = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const jds = await JobDescription.find().populate('job', 'title jobId').sort({ createdAt: -1 });
    res.json({ success: true, data: jds });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// JOB PUBLICATIONS
// ==========================================

exports.createJobPublication = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const publication = await JobPublication.create({
      ...req.body,
      publishedBy: req.user._id
    });

    await logActivity('Job', req.body.job, 'Published', `Job published on ${publication.platform}`, req.user._id);

    res.status(201).json({ success: true, data: publication });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getJobPublications = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { job, platform, status } = req.query;
    const filter = {};

    if (job) filter.job = job;
    if (platform) filter.platform = platform;
    if (status) filter.status = status;

    const publications = await JobPublication.find(filter)
      .populate('job', 'title jobId')
      .populate('publishedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: publications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJobPublication = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const publication = await JobPublication.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!publication) {
      return res.status(404).json({ message: 'Publication not found.' });
    }

    res.json({ success: true, data: publication });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// CANDIDATES & APPLICATIONS
// ==========================================

exports.createCandidate = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Create or find candidate
    let candidate = await Candidate.findOne({ email: req.body.email });
    
    if (!candidate) {
      candidate = await Candidate.create({
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone || '',
        resumeUrl: req.body.resumeUrl || '',
        status: 'Applied'
      });
    }

    // Create application
    const application = await CandidateApplication.create({
      job: req.body.job,
      candidate: candidate._id,
      source: req.body.source || 'Manual',
      recruiter: req.user._id,
      isInternalApplicant: req.body.isInternalApplicant || false,
      employeeId: req.body.employeeId
    });

    await logActivity('Candidate', candidate._id, 'Applied', `Candidate ${candidate.fullName} applied for job`, req.user._id, { job: req.body.job });

    res.status(201).json({ success: true, data: { candidate, application } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { job, status, source, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (source) filter.source = source;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    let candidates = await Candidate.find(filter).sort({ createdAt: -1 });

    // If job filter, get through applications
    if (job) {
      const applications = await CandidateApplication.find({ job }).populate('candidate');
      const candidateIds = applications.map(a => a.candidate._id);
      candidates = candidates.filter(c => candidateIds.some(id => id.equals(c._id)));
    }

    // Get applications for each candidate
    const candidatesWithApps = await Promise.all(candidates.map(async (c) => {
      const applications = await CandidateApplication.find({ candidate: c._id })
        .populate('job', 'title jobId department')
        .populate('recruiter', 'firstName lastName');
      return { ...c.toObject(), applications };
    }));

    res.json({ success: true, data: candidatesWithApps });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status } = req.body;
    const application = await CandidateApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    await logActivity('CandidateApplication', application._id, 'Status Changed', `Application status changed to ${status}`, req.user._id);

    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// INTERVIEWS
// ==========================================

exports.scheduleInterview = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const interview = await Interview.create({
      ...req.body,
      createdBy: req.user._id
    });

    // Update application status
    await CandidateApplication.findByIdAndUpdate(req.body.application, { status: 'Interview' });

    await logActivity('Interview', interview._id, 'Scheduled', `Interview scheduled for candidate`, req.user._id);

    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getInterviews = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { job, status, interviewer, dateFrom, dateTo } = req.query;
    const filter = {};

    if (job) filter.job = job;
    if (status) filter.status = status;
    if (interviewer) filter.interviewer = interviewer;
    if (dateFrom || dateTo) {
      filter.scheduledDate = {};
      if (dateFrom) filter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledDate.$lte = new Date(dateTo);
    }

    const interviews = await Interview.find(filter)
      .populate('candidate', 'fullName email phone')
      .populate('job', 'title jobId')
      .populate('interviewer', 'firstName lastName role')
      .sort({ scheduledDate: 1 });

    res.json({ success: true, data: interviews });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.submitInterviewFeedback = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }

    interview.feedbacks.push({
      ...req.body,
      interviewer: req.user._id
    });
    interview.feedbackStatus = 'Submitted';
    await interview.save();

    await logActivity('Interview', interview._id, 'Feedback', `Interview feedback submitted`, req.user._id);

    res.json({ success: true, data: interview });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// OFFERS
// ==========================================

exports.createOffer = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const offer = await RecruitmentOffer.create({
      ...req.body,
      createdBy: req.user._id
    });

    // Update application status
    await CandidateApplication.findByIdAndUpdate(req.body.application, { status: 'Offer' });

    await logActivity('Offer', offer._id, 'Created', `Offer created for candidate`, req.user._id);

    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, job } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (job) filter.job = job;

    const offers = await RecruitmentOffer.find(filter)
      .populate('candidate', 'fullName email phone')
      .populate('job', 'title jobId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateOfferStatus = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status } = req.body;
    const offer = await RecruitmentOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    offer.status = status;
    if (status === 'Sent') offer.sentDate = new Date();
    if (status === 'Accepted' || status === 'Rejected') offer.responseDate = new Date();
    await offer.save();

    // If accepted, update application and job
    if (status === 'Accepted') {
      await CandidateApplication.findByIdAndUpdate(offer.application, { status: 'Hired' });
    }

    await logActivity('Offer', offer._id, 'Status Changed', `Offer status changed to ${status}`, req.user._id);

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// ANALYTICS & REPORTS
// ==========================================

exports.getTalentAcquisitionOverview = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      openPositions,
      totalCandidates,
      interviewsThisWeek,
      activeOffers,
      hiredThisMonth,
      avgTimeToHire,
      recentActivity
    ] = await Promise.all([
      Job.countDocuments({ status: 'Open' }),
      Candidate.countDocuments(),
      Interview.countDocuments({ scheduledDate: { $gte: startOfWeek } }),
      RecruitmentOffer.countDocuments({ status: { $in: ['Sent', 'Pending Approval'] } }),
      CandidateApplication.countDocuments({ status: 'Hired', updatedAt: { $gte: startOfMonth } }),
      // Calculate average time to hire
      CandidateApplication.aggregate([
        { $match: { status: 'Hired' } },
        { $group: { _id: null, avgDays: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } }
      ]),
      RecruitmentActivity.find()
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const avgDays = avgTimeToHire[0]?.avgDays ? Math.round(avgTimeToHire[0].avgDays / (1000 * 60 * 60 * 24)) : 0;

    res.json({
      success: true,
      data: {
        openPositions,
        totalCandidates,
        interviewsThisWeek,
        activeOffers,
        hiredThisMonth,
        avgTimeToHireDays: avgDays,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRecruitmentFunnel = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { job, dateFrom, dateTo } = req.query;
    const filter = {};
    if (job) filter.job = job;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const stages = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected'];
    const funnel = await Promise.all(stages.map(async (stage) => {
      const count = await CandidateApplication.countDocuments({ ...filter, status: stage });
      return { stage, count };
    }));

    res.json({ success: true, data: funnel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRecruitmentActivity = async (req, res) => {
  try {
    if (!hasTAPermissions(req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { entityType, entityId, limit = 50 } = req.query;
    const filter = {};

    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    const activities = await RecruitmentActivity.find(filter)
      .populate('performedBy', 'firstName lastName role')
      .populate('job', 'title jobId')
      .populate('candidate', 'fullName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));


    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

