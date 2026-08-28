const BusinessOpportunity = require('../models/BusinessOpportunity');
const Partner = require('../models/Partner');
const Partnership = require('../models/PartnershipNew');
const PartnershipActivity = require('../models/PartnershipActivity');
const EmployeeBenefit = require('../models/EmployeeBenefit');
const CultureProgram = require('../models/CultureProgram');
const CultureEvent = require('../models/CultureEvent');
const EmployeeFeedback = require('../models/EmployeeFeedback');
const BusinessDevelopmentTask = require('../models/BusinessDevelopmentTask');
const BenefitSuggestion = require('../models/BenefitSuggestion');

const hasBDPermissions = (user) => {
  return ['HR Business Partner', 'HRM System Administrator', 'HR Manager', 'CRM core Administrator', 'Super Admin', 'Super CRM Administrator'].includes(user?.role);
};

// ==========================================
// OPPORTUNITIES
// ==========================================

exports.createOpportunity = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const opp = await BusinessOpportunity.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, data: opp });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getOpportunities = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { stage, priority, search } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (priority) filter.priority = priority;
    if (search) filter.$or = [{ companyName: { $regex: search, $options: 'i' } }, { opportunityId: { $regex: search, $options: 'i' } }];
    const opps = await BusinessOpportunity.find(filter).populate('owner', 'firstName lastName').sort({ createdAt: -1 });
    res.json({ success: true, data: opps });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateOpportunity = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const opp = await BusinessOpportunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!opp) return res.status(404).json({ message: 'Opportunity not found.' });
    res.json({ success: true, data: opp });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteOpportunity = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    await BusinessOpportunity.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// PARTNERSHIPS
// ==========================================

exports.createPartnership = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const partnership = await Partnership.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: partnership });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPartnerships = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { status, category, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$or = [{ companyName: { $regex: search, $options: 'i' } }, { partnershipId: { $regex: search, $options: 'i' } }];
    const partnerships = await Partnership.find(filter).populate('owner', 'firstName lastName').sort({ createdAt: -1 });
    res.json({ success: true, data: partnerships });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPartnershipById = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const partnership = await Partnership.findById(req.params.id).populate('owner', 'firstName lastName email').populate('partner');
    if (!partnership) return res.status(404).json({ message: 'Partnership not found.' });
    const activities = await PartnershipActivity.find({ partnership: partnership._id }).populate('user', 'firstName lastName').sort({ date: -1 });
    res.json({ success: true, data: { partnership, activities } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePartnership = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const partnership = await Partnership.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!partnership) return res.status(404).json({ message: 'Partnership not found.' });
    res.json({ success: true, data: partnership });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPartnershipActivities = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const activities = await PartnershipActivity.find({ partnership: req.params.id }).populate('user', 'firstName lastName').sort({ date: -1 });
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addPartnershipActivity = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const activity = await PartnershipActivity.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// BENEFITS
// ==========================================

exports.createBenefit = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const benefit = await EmployeeBenefit.create(req.body);
    res.status(201).json({ success: true, data: benefit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getBenefits = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const benefits = await EmployeeBenefit.find(filter).populate('partner', 'companyName').sort({ createdAt: -1 });
    res.json({ success: true, data: benefits });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateBenefit = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const benefit = await EmployeeBenefit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!benefit) return res.status(404).json({ message: 'Benefit not found.' });
    res.json({ success: true, data: benefit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// CULTURE PROGRAMS
// ==========================================

exports.createCultureProgram = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const program = await CultureProgram.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getCulturePrograms = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const programs = await CultureProgram.find(filter).populate('owner', 'firstName lastName').sort({ startDate: -1 });
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCultureProgram = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const program = await CultureProgram.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!program) return res.status(404).json({ message: 'Program not found.' });
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// EVENTS
// ==========================================

exports.createEvent = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const event = await CultureEvent.create({ ...req.body, organizer: req.user._id });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const events = await CultureEvent.find(filter).populate('organizer', 'firstName lastName').sort({ date: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const event = await CultureEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// SUGGESTIONS
// ==========================================

exports.createSuggestion = async (req, res) => {
  try {
    const suggestion = await BenefitSuggestion.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const suggestions = await BenefitSuggestion.find(filter).populate('submittedBy', 'firstName lastName department').populate('reviewedBy', 'firstName lastName').sort({ createdAt: -1 });
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateSuggestionStatus = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { status } = req.body;
    const suggestion = await BenefitSuggestion.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found.' });
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// FEEDBACK
// ==========================================

exports.createFeedback = async (req, res) => {
  try {
    const feedback = await EmployeeFeedback.create({ ...req.body, employee: req.user._id });
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const feedback = await EmployeeFeedback.find().populate('employee', 'firstName lastName').sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// TASKS
// ==========================================

exports.createTask = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const task = await BusinessDevelopmentTask.create(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const { status, assignedTo } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    const tasks = await BusinessDevelopmentTask.find(filter).populate('assignedTo', 'firstName lastName').populate('opportunity', 'companyName').populate('partnership', 'companyName').sort({ dueDate: 1 });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const task = await BusinessDevelopmentTask.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==========================================
// ANALYTICS & OVERVIEW
// ==========================================

exports.getOverview = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      activePartnerships,
      openOpportunities,
      activeBenefits,
      activePrograms,
      pendingSuggestions,
      upcomingRenewals,
      recentActivities
    ] = await Promise.all([
      Partnership.countDocuments({ status: 'Active' }),
      BusinessOpportunity.countDocuments({ stage: { $ne: 'Lost', $ne: 'Partnership' } }),
      EmployeeBenefit.countDocuments({ status: 'Active' }),
      CultureProgram.countDocuments({ status: 'Active' }),
      BenefitSuggestion.countDocuments({ status: 'Pending' }),
      Partnership.countDocuments({ renewalDate: { $lte: thirtyDaysFromNow, $gte: now }, status: 'Active' }),
      PartnershipActivity.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      data: {
        activePartnerships,
        openOpportunities,
        activeBenefits,
        activePrograms,
        pendingSuggestions,
        upcomingRenewals,
        recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPipeline = async (req, res) => {
  try {
    if (!hasBDPermissions(req.user)) return res.status(403).json({ message: 'Access denied.' });
    const stages = ['Lead', 'Contacted', 'Discussion', 'Proposal', 'Negotiation', 'Approval', 'Partnership'];
    const pipeline = await Promise.all(stages.map(async (stage) => {
      const count = await BusinessOpportunity.countDocuments({ stage });
      return { stage, count };
    }));
    res.json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

