const User = require('../models/User');
const Contract = require('../models/Contract');
const GovDocTemplate = require('../models/GovDocTemplate');
const DetailedSchedule = require('../models/DetailedSchedule');
const KPI = require('../models/KPI');
const Training = require('../models/Training');
const JobVacancy = require('../models/JobVacancy');
const PayrollEntry = require('../models/PayrollEntry');
const PayrollAlert = require('../models/PayrollAlert');
const EmployeeLoan = require('../models/EmployeeLoan');
const { put } = require('@vercel/blob');
const Candidate = require('../models/Candidate');
const Partnership = require('../models/Partnership');
const Email = require('../models/Email');
const LeaveRequest = require('../models/LeaveRequest');
const BenefitSuggestion = require('../models/BenefitSuggestion');
const AuxLog = require('../models/AuxLog');
const AuxSchedule = require('../models/AuxSchedule');
const ScheduleChangeLog = require('../models/ScheduleChangeLog');
const SystemSetting = require('../models/SystemSetting');
const { sendEmail, getGlobalEmailConfig } = require('../services/emailService');
const { notifyEmployee } = require('../services/notificationService');

// Default doc keys that are always stored in govDocs (not customGovDocs)
const DEFAULT_DOC_KEYS = ['nationalId', 'socialInsurance', 'militaryStatus', 'graduationCertificate', 'criminalRecord'];

// --- 1. INTERNAL EMAILS (Cannot be deleted) ---
exports.sendEmail = async (req, res) => {
  try {
    const { recipientEmail, subject, body, parentId } = req.body;
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const emailObj = await Email.create({
      senderId: req.user._id,
      recipientId: recipient._id,
      subject,
      body,
      parentId: parentId || null,
      isReply: !!parentId,
      fromEmail: req.user.smtpUser || req.user.email,
      toEmail: recipient.email
    });

    try {
      const globalConfig = await getGlobalEmailConfig();
      await sendEmail(req.user, {
        to: recipient.email,
        subject: subject,
        text: body,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;">${body}</div>`
      }, globalConfig);
      emailObj.status = 'sent';
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
      emailObj.status = 'failed';
      emailObj.providerError = emailErr.message;
    }

    await emailObj.save();

    // Populate sender info for the response
    await emailObj.populate('senderId', 'firstName lastName email role');
    await emailObj.populate('recipientId', 'firstName lastName email role');

    res.status(201).json({ success: true, data: emailObj });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const emails = await Email.find({ recipientId: req.user._id })
      .populate('senderId', 'firstName lastName email role')
      .populate('recipientId', 'firstName lastName email role')
      .sort({ sentAt: -1 });

    const unreadCount = emails.filter(e => !e.isRead).length;
    res.json({ success: true, data: emails, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSent = async (req, res) => {
  try {
    const emails = await Email.find({ senderId: req.user._id })
      .populate('recipientId', 'firstName lastName email role')
      .populate('senderId', 'firstName lastName email role')
      .sort({ sentAt: -1 });
    res.json({ success: true, data: emails });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getEmailPreview = async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, senderId: req.user._id })
      .populate('recipientId', 'firstName lastName email role')
      .populate('senderId', 'firstName lastName email role');
    if (!email) return res.status(404).json({ message: 'Email not found' });
    res.json({ success: true, data: email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch the full reply thread for an email
exports.getEmailThread = async (req, res) => {
  try {
    const { id } = req.params;
    // Support viewing thread from a reply: resolve root email first
    const email = await Email.findById(id);
    const rootId = email?.parentId || id;
    const replies = await Email.find({ parentId: rootId })
      .populate('senderId', 'firstName lastName email role')
      .populate('recipientId', 'firstName lastName email role')
      .sort({ sentAt: 1 });
    res.json({ success: true, data: replies });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark an email as read
exports.markEmailRead = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await Email.findOne({ _id: id, recipientId: req.user._id });
    if (!email) return res.status(404).json({ message: 'Email not found' });
    email.isRead = true;
    email.readAt = new Date();
    await email.save();
    res.json({ success: true, data: email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




// --- 2. CONTRACTS & SALARIES ---
exports.uploadSignedContract = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const { employeeId } = req.body;
    const targetId = employeeId || req.user._id;
    const contract = await Contract.findOne({ employeeId: targetId });
    if (!contract) return res.status(404).json({ message: 'Contract not found. Create a contract first.' });
    
    const uniqueFilename = `gov-docs/signed-contract-${Date.now()}-${req.file.originalname}`;
    const blob = await put(uniqueFilename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });
    
    contract.signedContractFile = blob.url;
    await contract.save();
    res.json({ success: true, fileUrl: contract.signedContractFile, data: contract });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.upsertSalaryComponent = async (req, res) => {
  try {
    const { employeeId, componentId, label, type, valueType, value, kpiLinked, note } = req.body;
    const isHR = ['HRM System Administrator', 'HR Manager', 'HR Specialist (Generalist)', 'Super CRM Administrator', 'HR Director / Executive HR User'].includes(req.user.role);
    if (!isHR) return res.status(403).json({ message: 'Access denied.' });
    const contract = await Contract.findOne({ employeeId });
    if (!contract) return res.status(404).json({ message: 'Contract not found.' });
    if (componentId) {
      const comp = contract.salaryComponents.id(componentId);
      if (!comp) return res.status(404).json({ message: 'Component not found.' });
      comp.label = label; comp.type = type; comp.valueType = valueType;
      comp.value = Number(value); comp.kpiLinked = !!kpiLinked; comp.note = note || '';
    } else {
      contract.salaryComponents.push({ label, type, valueType, value: Number(value), kpiLinked: !!kpiLinked, note: note || '', addedBy: req.user._id });
    }
    await contract.save();
    res.json({ success: true, data: contract.salaryComponents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteSalaryComponent = async (req, res) => {
  try {
    const isHR = ['HRM System Administrator', 'HR Manager', 'HR Specialist (Generalist)', 'Super CRM Administrator', 'HR Director / Executive HR User'].includes(req.user.role);
    if (!isHR) return res.status(403).json({ message: 'Access denied.' });
    const { employeeId } = req.query;
    const contract = await Contract.findOne({ employeeId });
    if (!contract) return res.status(404).json({ message: 'Contract not found.' });
    contract.salaryComponents = contract.salaryComponents.filter(c => c._id.toString() !== req.params.id);
    await contract.save();
    res.json({ success: true, data: contract.salaryComponents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.upsertContract = async (req, res) => {
  try {
    const { employeeId, baseSalary, netSalary, hireDate, contractEndDate, govDocs, requiredDocsToUpload } = req.body;

    let contract = await Contract.findOne({ employeeId });
    if (contract) {
      // Record salary history if net salary changes
      if (Number(contract.netSalary) !== Number(netSalary)) {
        contract.salaryHistory.push({
          amount: Number(netSalary),
          changedBy: req.user._id,
          reason: 'Initial setup update / contract adjustments'
        });
      }
      contract.baseSalary = baseSalary;
      contract.netSalary = netSalary;
      contract.hireDate = hireDate;
      contract.contractEndDate = contractEndDate;
      if (govDocs) contract.govDocs = govDocs;
      if (requiredDocsToUpload) contract.requiredDocsToUpload = requiredDocsToUpload;
      await contract.save();
    } else {
      contract = await Contract.create({
        employeeId,
        baseSalary,
        netSalary,
        hireDate,
        contractEndDate,
        govDocs: govDocs || {},
        requiredDocsToUpload: requiredDocsToUpload || undefined,
        salaryHistory: [{
          amount: Number(netSalary),
          changedBy: req.user._id,
          reason: 'Contract established'
        }]
      });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateNetSalaryOnly = async (req, res) => {
  try {
    const { netSalary, reason } = req.body;
    const { id } = req.params;
    
    const isAuth = req.user.isPersonalTeamLeader || 
                   ['HR Manager', 'HRM System Administrator', 'Super CRM Administrator'].includes(req.user.role);
    
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized. Only the Personal Team Leader or HR Managers can edit Net Salary.' });
    }

    let contract = await Contract.findOne({ employeeId: id });
    if (!contract) {
      contract = await Contract.findById(id);
    }
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Log Salary History
    contract.salaryHistory.push({
      amount: Number(netSalary),
      changedBy: req.user._id,
      reason: reason || 'Adjustment by Team Leader'
    });

    contract.netSalary = netSalary;
    await contract.save();

    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate('employeeId', 'firstName lastName email role department')
      .populate('salaryHistory.changedBy', 'firstName lastName role');
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ employeeId: req.user._id })
      .populate('salaryHistory.changedBy', 'firstName lastName role');
    // Return null data (not 404) when no contract exists yet — frontend handles gracefully
    res.json({ success: true, data: contract || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Document Upload Status
exports.updateGovDocs = async (req, res) => {
  try {
    const { govDocs, requiredDocsToUpload } = req.body;
    const { employeeId } = req.body;

    const targetEmployeeId = employeeId || req.user._id;

    const contract = await Contract.findOne({ employeeId: targetEmployeeId });
    if (!contract) {
      return res.status(404).json({ message: 'Contract details do not exist for this user. Create a contract first.' });
    }

    if (govDocs) {
      contract.govDocs = { ...contract.govDocs, ...govDocs };
      // Set to Submitted for verification
      Object.keys(govDocs).forEach((key) => {
        if (govDocs[key]) {
          contract.govDocsDetails[key] = {
            status: 'Submitted',
            remarks: 'Awaiting HR verification',
            verifiedBy: null
          };
        }
      });
    }
    if (requiredDocsToUpload) {
      contract.requiredDocsToUpload = requiredDocsToUpload;
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// HR Upload Soft Copy of a Government Document
exports.uploadGovDocFile = async (req, res) => {
  try {
    const { employeeId, docField, isCustom } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!docField) {
      return res.status(400).json({ message: 'docField is required' });
    }

    const targetEmployeeId = employeeId || req.user._id;

    const contract = await Contract.findOne({ employeeId: targetEmployeeId });
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found. Create a contract first.' });
    }

    const uniqueFilename = `gov-docs/govdoc-${Date.now()}-${req.file.originalname}`;
    const blob = await put(uniqueFilename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });
    const fileUrl = blob.url;
    
    const detailsPayload = {
      status: 'Submitted',
      remarks: 'File uploaded – awaiting HR verification',
      verifiedBy: null,
      uploadedAt: new Date()
    };

    const isCustomDoc = isCustom === 'true' || isCustom === true || !DEFAULT_DOC_KEYS.includes(docField);

    if (isCustomDoc) {
      // Custom doc: goes into customGovDocs / customGovDocsDetails
      const customDocs = contract.customGovDocs || {};
      const customDetails = contract.customGovDocsDetails || {};
      customDocs[docField] = fileUrl;
      customDetails[docField] = detailsPayload;
      contract.customGovDocs = customDocs;
      contract.customGovDocsDetails = customDetails;
      contract.markModified('customGovDocs');
      contract.markModified('customGovDocsDetails');
    } else {
      // Default doc: goes into govDocs / govDocsDetails
      contract.govDocs = { ...contract.govDocs, [docField]: fileUrl };
      if (!contract.govDocsDetails) contract.govDocsDetails = {};
      contract.govDocsDetails[docField] = detailsPayload;
    }

    await contract.save();
    res.json({ success: true, data: contract, fileUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// HR Verification (Approve/Reject Gov Doc) — handles both default and custom docs
exports.verifyGovDoc = async (req, res) => {
  try {
    const { docField, status, remarks, isCustom } = req.body;
    const { id } = req.params;

    let contract = await Contract.findById(id);
    if (!contract) contract = await Contract.findOne({ employeeId: id });
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    const isCustomDoc = isCustom === 'true' || isCustom === true || !DEFAULT_DOC_KEYS.includes(docField);

    if (isCustomDoc) {
      const customDetails = contract.customGovDocsDetails || {};
      if (!customDetails[docField]) customDetails[docField] = {};
      customDetails[docField].status = status;
      customDetails[docField].remarks = remarks || '';
      customDetails[docField].verifiedBy = req.user._id;
      contract.customGovDocsDetails = customDetails;
      contract.markModified('customGovDocsDetails');
    } else {
      if (!contract.govDocsDetails[docField]) contract.govDocsDetails[docField] = {};
      contract.govDocsDetails[docField].status = status;
      contract.govDocsDetails[docField].remarks = remarks || '';
      contract.govDocsDetails[docField].verifiedBy = req.user._id;

      if (status === 'Approved') {
        const docLabelMap = {
          nationalId: 'National ID',
          socialInsurance: 'Social Insurance Certificate',
          militaryStatus: 'Military Status',
          graduationCertificate: 'Graduation Certificate',
          criminalRecord: 'Criminal Record'
        };
        contract.requiredDocsToUpload = contract.requiredDocsToUpload.filter(
          d => d !== docLabelMap[docField]
        );
      }
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- GOV DOC TEMPLATES (Super Admin manages document requirements) ---
const DEFAULT_TEMPLATES = [
  { key: 'nationalId', label: 'National ID', labelAr: 'الرقم القومي', isDefault: true },
  { key: 'socialInsurance', label: 'Social Insurance Certificate', labelAr: 'برنت التأمينات', isDefault: true },
  { key: 'militaryStatus', label: 'Military Status', labelAr: 'موقف التجنيد', isDefault: true },
  { key: 'graduationCertificate', label: 'Graduation Certificate', labelAr: 'شهادة التخرج', isDefault: true },
  { key: 'criminalRecord', label: 'Criminal Record / Fish', labelAr: 'فيش جنائي', isDefault: true },
];

exports.getGovDocTemplates = async (req, res) => {
  try {
    // Seed defaults if they don't exist yet
    for (const t of DEFAULT_TEMPLATES) {
      await GovDocTemplate.findOneAndUpdate(
        { key: t.key },
        { $setOnInsert: { ...t, isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    const templates = await GovDocTemplate.find({ isActive: true }).sort({ isDefault: -1, createdAt: 1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createGovDocTemplate = async (req, res) => {
  try {
    const { label, labelAr, description, isRequired } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ message: 'Document label is required' });
    }
    // Generate a slug key from label
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const existing = await GovDocTemplate.findOne({ key });
    if (existing) {
      return res.status(409).json({ message: 'A document requirement with this name already exists' });
    }
    const template = await GovDocTemplate.create({
      key,
      label: label.trim(),
      labelAr: labelAr || '',
      description: description || '',
      isRequired: isRequired !== false,
      isDefault: false,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteGovDocTemplate = async (req, res) => {
  try {
    const template = await GovDocTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (template.isDefault) {
      return res.status(403).json({ message: 'Default document requirements cannot be removed' });
    }
    template.isActive = false;
    await template.save();
    res.json({ success: true, message: 'Document requirement removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- 3. LEAVE REQUESTS & SHIFTS ---
const ANNUAL_PAID_DAYS = 21;

// Count calendar days between two dates inclusive
const countDays = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

// Sum approved leave days used in the current calendar year for an employee
const getPaidDaysUsed = async (employeeId) => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const approved = await LeaveRequest.find({
    employeeId,
    status: 'Approved',
    paidDays: { $gt: 0 },
    startDate: { $gte: yearStart }
  });
  return approved.reduce((sum, l) => sum + (l.paidDays || 0), 0);
};

exports.getLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user._id;
    const used = await getPaidDaysUsed(employeeId);
    res.json({ success: true, data: { total: ANNUAL_PAID_DAYS, used, remaining: Math.max(0, ANNUAL_PAID_DAYS - used) } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const daysCount = countDays(startDate, endDate);
    const usedSoFar = await getPaidDaysUsed(req.user._id);
    const remaining = Math.max(0, ANNUAL_PAID_DAYS - usedSoFar);
    const paidDays   = Math.min(daysCount, remaining);
    const unpaidDays = daysCount - paidDays;
    const leave = await LeaveRequest.create({
      employeeId: req.user._id,
      leaveType, startDate, endDate, reason,
      daysCount, paidDays, unpaidDays
    });
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    let query = {};
    const isHR = ['HRM System Administrator', 'HR Manager', 'HR Specialist (Generalist)', 'Super CRM Administrator'].includes(req.user.role);
    if (!isHR) {
      query.employeeId = req.user._id;
    }
    const leaves = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email role department')
      .populate('reviewedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const leave = await LeaveRequest.findById(id).populate('employeeId', 'firstName lastName email _id');
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    await leave.save();

    // Notify the employee of the leave decision via internal email
    try {
      const emp = leave.employeeId;
      if (emp) {
        const leaveStart = new Date(leave.startDate).toLocaleDateString();
        const leaveEnd   = new Date(leave.endDate).toLocaleDateString();
        const statusEmoji = status === 'Approved' ? '✅' : '❌';
        await Email.create({
          senderId: req.user._id,
          recipientId: emp._id,
          subject: `${statusEmoji} Your Leave Request has been ${status}`,
          body: `Dear ${emp.firstName},\n\nYour ${leave.leaveType} leave request from ${leaveStart} to ${leaveEnd} (${leave.daysCount} day${leave.daysCount !== 1 ? 's' : ''}) has been ${status}.\n\n${leave.paidDays > 0 ? `Paid days: ${leave.paidDays}` : ''}${leave.unpaidDays > 0 ? `\nUnpaid days: ${leave.unpaidDays}` : ''}\n\nReviewed by: ${req.user.firstName} ${req.user.lastName}\n\nIf you have any questions, please contact the HR department.\n\nBest regards,\nHR Department`,
          fromEmail: req.user.email,
          toEmail: emp.email
        });
      }
    } catch (notifyErr) {
      console.error('Failed to send leave notification:', notifyErr.message);
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDetailedSchedule = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    if (!employeeId || !month) {
      return res.status(400).json({ message: 'employeeId and month (YYYY-MM) are required.' });
    }

    let schedule = await DetailedSchedule.findOne({ employeeId, month });
    if (!schedule) {
      // If not found, fetch default values from User model to seed base month schedule
      const employee = await User.findById(employeeId);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      
      schedule = await DetailedSchedule.create({
        employeeId,
        month,
        defaultShift: employee.shift || 'Day Shift (09:00 - 17:00)',
        defaultOffDays: employee.weeklyOffDays || ['Friday', 'Saturday'],
        weeklyOverrides: {},
        dailyOverrides: {}
      });
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateDetailedSchedule = async (req, res) => {
  try {
    const { employeeId, month, defaultShift, defaultOffDays, weeklyOverrides, dailyOverrides, changeSource, changeNote } = req.body;

    const isHR = ['HRM System Administrator', 'HR Manager', 'Super CRM Administrator'].includes(req.user.role);
    const isRTM = ['RTM Team Member'].includes(req.user.role);
    const isOwnSchedule = req.user._id.toString() === employeeId?.toString();

    if (!isHR && !isRTM && !isOwnSchedule) {
      return res.status(403).json({ message: 'Not authorized to change this schedule.' });
    }

    let schedule = await DetailedSchedule.findOne({ employeeId, month });
    const oldSchedule = schedule ? {
      defaultShift: schedule.defaultShift,
      defaultOffDays: schedule.defaultOffDays,
      weeklyOverrides: schedule.weeklyOverrides,
      dailyOverrides: schedule.dailyOverrides,
    } : null;

    if (!schedule) {
      schedule = new DetailedSchedule({ employeeId, month });
    }

    const changedFields = [];
    if (defaultShift !== undefined && defaultShift !== schedule.defaultShift) {
      changedFields.push({ field: 'defaultShift', oldValue: schedule.defaultShift, newValue: defaultShift });
      schedule.defaultShift = defaultShift;
    }
    if (defaultOffDays !== undefined) {
      changedFields.push({ field: 'defaultOffDays', oldValue: schedule.defaultOffDays, newValue: defaultOffDays });
      schedule.defaultOffDays = defaultOffDays;
    }
    if (weeklyOverrides !== undefined) {
      changedFields.push({ field: 'weeklyOverrides', oldValue: oldSchedule?.weeklyOverrides, newValue: weeklyOverrides });
      schedule.weeklyOverrides = weeklyOverrides;
      schedule.markModified('weeklyOverrides');
    }
    if (dailyOverrides !== undefined) {
      changedFields.push({ field: 'dailyOverrides', oldValue: oldSchedule?.dailyOverrides, newValue: dailyOverrides });
      schedule.dailyOverrides = dailyOverrides;
      schedule.markModified('dailyOverrides');
    }
    schedule.createdBy = req.user._id;

    await schedule.save();

    // Determine change source
    const source = changeSource || (isRTM ? 'RTM' : isOwnSchedule ? 'Personal' : 'HR');

    // Write change log entries for each changed field
    for (const ch of changedFields) {
      await ScheduleChangeLog.create({
        employeeId,
        changedBy: req.user._id,
        changedByRole: req.user.role,
        changeSource: source,
        month,
        field: ch.field,
        oldValue: ch.oldValue,
        newValue: ch.newValue,
        note: changeNote || ''
      });
    }

    if (defaultShift) {
      await User.findByIdAndUpdate(employeeId, {
        shift: defaultShift,
        weeklyOffDays: defaultOffDays
      });
    }

    // ── Sync to the employee's workspace (AuxSchedule) ──────────
    // The ESS "My Schedule" workspace view reads AuxSchedule, while HR
    // assigns schedules via DetailedSchedule. Without this sync, an
    // employee's assigned daily/weekly/monthly schedule never appears
    // in their workspace. We mirror the assignment here on every change.
    try {
      const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
      const weeklyOverrides = weekLabels
        .filter(w => schedule.weeklyOverrides && schedule.weeklyOverrides.get && schedule.weeklyOverrides.get(w))
        .map(w => {
          const o = schedule.weeklyOverrides.get(w);
          return {
            weekLabel: w,
            liveMinutes: schedule.defaultLiveTarget ?? 480,
            breakMinutes: schedule.defaultBreakTarget ?? 60,
            trainingMinutes: schedule.defaultTrainingTarget ?? 0,
            coachingMinutes: schedule.defaultCoachingTarget ?? 0,
          };
        });

      await AuxSchedule.findOneAndUpdate(
        { userId: employeeId, month },
        {
          userId: employeeId,
          month,
          monthlyPlan: {
            liveMinutes: schedule.defaultLiveTarget ?? 480,
            breakMinutes: schedule.defaultBreakTarget ?? 60,
            trainingMinutes: schedule.defaultTrainingTarget ?? 0,
            coachingMinutes: schedule.defaultCoachingTarget ?? 0,
          },
          weeklyOverrides,
          updatedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (syncErr) {
      console.error('Failed to sync DetailedSchedule -> AuxSchedule:', syncErr.message);
    }

    // ── Notify the employee of the schedule assignment/update ────
    if (changedFields.length > 0 && !isOwnSchedule) {
      const emp = await User.findById(employeeId).select('firstName email');
      if (emp) {
        const summary = changedFields.map(c => c.field).join(', ');
        await notifyEmployee({
          senderId: req.user._id,
          recipientId: employeeId,
          subject: `Your schedule for ${month} has been ${oldSchedule ? 'updated' : 'assigned'}`,
          body: `Dear ${emp.firstName},\n\nYour work schedule for ${month} has been ${oldSchedule ? 'updated' : 'assigned'} (${summary}).\n\nShift: ${schedule.defaultShift}\nDefault Off Days: ${(schedule.defaultOffDays || []).join(', ')}\n\nYou can view the full plan under Employee Self-Service > My Schedule.\n\nBest regards,\nHR Department`,
        });
      }
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- 4. TRAINING & AUX STATUS ---
exports.createTraining = async (req, res) => {
  try {
    const { employeeId, type, assignedTrainerId, topic, scheduledDate } = req.body;
    const training = await Training.create({
      employeeId,
      type,
      assignedTrainerId,
      topic,
      scheduledDate: scheduledDate || null,
      status: 'Assigned'
    });

    // Auto-Email Supervisor if Technical Training
    if (type === 'Technical') {
      const trainer = await User.findById(assignedTrainerId);
      const student = await User.findById(employeeId);
      if (trainer && student) {
        await Email.create({
          senderId: req.user._id,
          recipientId: trainer._id,
          subject: `Technical Training Assignment: ${student.firstName} ${student.lastName}`,
          body: `Hello ${trainer.firstName},\n\nYou have been assigned as the technical trainer for ${student.firstName} ${student.lastName} (Role: ${student.role}) on the topic: "${topic}".\n\nPlease coordinate their sessions and submit a report upon completion.\n\nBest regards,\nSuper ERP Training Department`
        });
      }
    }

    res.status(201).json({ success: true, data: training });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTrainings = async (req, res) => {
  try {
    let query = {};
    const hrmPrivileged = ['HRM System Administrator', 'HR Manager', 'Super CRM Administrator', 'Training and Development Specialist'];
    if (!hrmPrivileged.includes(req.user.role)) {
      query = {
        $or: [
          { employeeId: req.user._id },
          { assignedTrainerId: req.user._id }
        ]
      };
    }
    const trainings = await Training.find(query)
      .populate('employeeId', 'firstName lastName email role')
      .populate('assignedTrainerId', 'firstName lastName email role');
    res.json({ success: true, data: trainings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTrainingReport = async (req, res) => {
  try {
    const { status, report, performanceRating } = req.body;
    const { id } = req.params;

    const training = await Training.findById(id);
    if (!training) {
      return res.status(404).json({ message: 'Training record not found' });
    }

    const isTrainer = training.assignedTrainerId.toString() === req.user._id.toString();
    const isHR = ['HRM System Administrator', 'HR Manager', 'Training and Development Specialist', 'Super CRM Administrator'].includes(req.user.role);

    if (!isTrainer && !isHR) {
      return res.status(403).json({ message: 'Not authorized to update this training report' });
    }

    if (status) training.status = status;
    if (report !== undefined) training.report = report;
    if (performanceRating !== undefined && performanceRating !== null) {
      training.performanceRating = Number(performanceRating);
    }
    await training.save();

    // Auto-create KPI reward log if completed with a good star rating (>= 4 stars)
    if (status === 'Completed' && performanceRating && Number(performanceRating) >= 4) {
      await KPI.create({
        employeeId: training.employeeId,
        title: `Training Complete: ${training.topic}`,
        description: `Successfully completed training course with ${performanceRating}/5 star rating. Trainer Notes: ${report || 'N/A'}`,
        score: Math.round((Number(performanceRating) / 5) * 100),
        createdBy: req.user._id
      });
    }

    res.json({ success: true, data: training });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAuxStatus = async (req, res) => {
  try {
    const { auxStatus } = req.body;
    const now = new Date();

    // Validate against enabled AUXes (Live and Logged out are always allowed)
    if (!['Live', 'Logged out'].includes(auxStatus)) {
      const auxSetting = await SystemSetting.findOne({ key: 'auxConfig' });
      if (auxSetting && auxSetting.value && auxSetting.value.availableAuxes) {
        const enabledAux = auxSetting.value.availableAuxes.find(a => a.name === auxStatus && a.enabled);
        if (!enabledAux) {
          return res.status(400).json({ message: `AUX type "${auxStatus}" is not enabled by your administrator.` });
        }
      }
    }

    // Close the previous open log entry
    const openLog = await AuxLog.findOne({ userId: req.user._id, endedAt: null });
    if (openLog) {
      openLog.endedAt = now;
      openLog.durationMinutes = Math.round((now - openLog.startedAt) / 60000);
      await openLog.save();
    }

    // Open a new log entry
    const newLog = await AuxLog.create({ userId: req.user._id, status: auxStatus, startedAt: now });

    req.user.auxStatus = auxStatus;
    req.user.activeStatusSince = now;
    await req.user.save();
    res.json({ success: true, data: { auxStatus: req.user.auxStatus, statusSince: newLog.startedAt } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Parse the HH:MM - HH:MM window out of a shift string like "Day Shift (09:00 - 17:00)"
const parseShiftWindow = (shiftStr) => {
  if (!shiftStr) return null;
  const m = shiftStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const toMin = (h, min) => h * 60 + min;
  const start = toMin(parseInt(m[1], 10), parseInt(m[2], 10));
  let end = toMin(parseInt(m[3], 10), parseInt(m[4], 10));
  // Handle overnight shifts (end <= start means it crosses midnight)
  const overnight = end <= start;
  return { start, end, overnight };
};

// Resolve the team label for grouping (department, fallback to shift label)
const teamOf = (u) => {
  const dept = (u.department || '').trim();
  if (dept) return dept;
  const m = (u.shift || '').match(/^(.*?)\s*\(/);
  return m ? m[1].trim() : 'Unassigned';
};

exports.getTeamAux = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }, 'firstName lastName email role department auxStatus activeStatusSince shift weeklyOffDays rtmFlagged rtmFlaggedAt rtmFlagReason rtmSuppressUntil');

    // Load AUX config for break duration thresholds
    const auxSetting = await SystemSetting.findOne({ key: 'auxConfig' });
    const auxConfig = auxSetting?.value?.availableAuxes || [];
    const getMaxMinutes = (name) => {
      const cfg = auxConfig.find(a => a.name === name);
      return cfg && cfg.timingMode === 'fixed' && cfg.defaultMinutes ? cfg.defaultMinutes : null;
    };
    const breakMaxMinutes = getMaxMinutes('Break') || 15;
    const lunchMaxMinutes = getMaxMinutes('Lunch') || 30;

    // Attach today's live duration for each user
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const logs = await AuxLog.find({ startedAt: { $gte: todayStart } });

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

    const usersWithStats = [];
    
    for (const u of users) {
      const userLogs = logs.filter(l => l.userId.toString() === u._id.toString());
      const stats = { Live: 0, Break: 0, Lunch: 0, Training: 0, Coaching: 0, Other: 0, 'Logged out': 0 };
      let activeStatusSince = u.activeStatusSince || null;
      let activeLiveLog = null;
      let activeBreakLog = null;
      let activeLunchLog = null;

      userLogs.forEach(l => {
        if (l.endedAt === null) {
          activeStatusSince = l.startedAt;
          if (l.status === 'Live') activeLiveLog = l;
          if (l.status === 'Break') activeBreakLog = l;
          if (l.status === 'Lunch') activeLunchLog = l;
        }
        const mins = l.durationMinutes ?? Math.round((Date.now() - l.startedAt) / 60000);
        stats[l.status] = (stats[l.status] || 0) + mins;
      });

      // Determine shift window + whether the user is currently within it
      const window = parseShiftWindow(u.shift);
      let withinShift = true;
      let isOffDay = false;
      if (window) {
        if (window.overnight) {
          withinShift = nowMin >= window.start || nowMin <= window.end;
        } else {
          withinShift = nowMin >= window.start && nowMin <= window.end;
        }
        isOffDay = Array.isArray(u.weeklyOffDays) && u.weeklyOffDays.includes(dayName);
      }

      // Suppression logic
      const suppressed = u.rtmSuppressUntil && new Date(u.rtmSuppressUntil).getTime() > Date.now();
      const suppressUntil = suppressed ? new Date(u.rtmSuppressUntil).getTime() : null;

      // --- Enhanced Flagging Logic ---
      let shouldFlag = suppressed ? false : u.rtmFlagged;
      let flagReason = u.rtmFlagReason;

      if (!suppressed) {
        // 1) Extended Live (>= 3 hours)
        if (activeLiveLog) {
          const liveDurationMinutes = Math.round((Date.now() - activeLiveLog.startedAt) / 60000);
          if (liveDurationMinutes >= 180) {
            shouldFlag = true;
            flagReason = 'Extended Live';
          }
        }

        // 2) Extended Break (exceeds configured max)
        if (activeBreakLog && !shouldFlag) {
          const breakDurationMinutes = Math.round((Date.now() - activeBreakLog.startedAt) / 60000);
          if (breakDurationMinutes > breakMaxMinutes) {
            shouldFlag = true;
            flagReason = 'Extended Break';
          }
        }

        // 3) Extended Lunch (exceeds configured max)
        if (activeLunchLog && !shouldFlag) {
          const lunchDurationMinutes = Math.round((Date.now() - activeLunchLog.startedAt) / 60000);
          if (lunchDurationMinutes > lunchMaxMinutes) {
            shouldFlag = true;
            flagReason = 'Extended Break'; // reuse Extended Break flag reason for Lunch overruns
          }
        }

        // 4) Working on Off Day
        if (activeLiveLog && isOffDay && !shouldFlag) {
          shouldFlag = true;
          flagReason = 'Working on Off Day';
        }

        // 5) Out of Shift (active but outside shift window, not an off-day)
        if (activeLiveLog && window && !withinShift && !isOffDay && !shouldFlag) {
          shouldFlag = true;
          flagReason = 'Out of Shift';
        }
      }

      if (shouldFlag && !u.rtmFlagged) {
        u.rtmFlagged = true;
        u.rtmFlaggedAt = new Date();
        u.rtmFlagReason = flagReason;
        await u.save();
      } else if (shouldFlag && u.rtmFlagged && flagReason && !u.rtmFlagReason) {
        u.rtmFlagReason = flagReason;
        await u.save();
      }

      usersWithStats.push({
        ...u.toObject(),
        todayStats: stats,
        activeStatusSince,
        team: teamOf(u),
        withinShift,
        isOffDay,
        rtmFlagged: shouldFlag,
        rtmFlagReason: shouldFlag ? flagReason : null,
        rtmSuppressUntil: suppressUntil,
      });
    }

    res.json({ success: true, data: usersWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRtmFlag = async (req, res) => {
  try {
    const { employeeId, rtmFlagged, rtmFlagReason } = req.body;
    const userToUpdate = await User.findById(employeeId);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
    
    userToUpdate.rtmFlagged = !!rtmFlagged;
    if (rtmFlagged) {
      userToUpdate.rtmFlaggedAt = new Date();
      userToUpdate.rtmFlagReason = rtmFlagReason || 'Manual';
      userToUpdate.rtmSuppressUntil = null;
    } else {
      userToUpdate.rtmFlaggedAt = null;
      userToUpdate.rtmFlagReason = null;
      userToUpdate.rtmSuppressUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await userToUpdate.save();
    res.json({ success: true, data: userToUpdate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- 5. TALENT ACQUISITION ---
exports.createVacancy = async (req, res) => {
  try {
    const { title, description, requirements, salaryRange } = req.body;
    const vacancy = await JobVacancy.create({ title, description, requirements, salaryRange });
    res.status(201).json({ success: true, data: vacancy });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getVacancies = async (req, res) => {
  try {
    const vacancies = await JobVacancy.find().sort({ createdAt: -1 });
    res.json({ success: true, data: vacancies });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const { vacancyId, fullName, email, phone, resumeUrl } = req.body;
    const candidate = await Candidate.create({ vacancyId, fullName, email, phone, resumeUrl });
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find()
      .populate('vacancyId')
      .populate('interviewerNotes.addedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: candidates });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCandidateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    candidate.status = status;
    await candidate.save();
    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addCandidateFeedback = async (req, res) => {
  try {
    const { note } = req.body;
    const { id } = req.params;

    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Note text is required.' });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    candidate.interviewerNotes.push({
      note: note.trim(),
      addedBy: req.user._id,
      addedAt: new Date()
    });

    await candidate.save();
    await candidate.populate('interviewerNotes.addedBy', 'firstName lastName role');
    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- 6. KPIs & ACHIEVEMENTS ---
exports.createKPI = async (req, res) => {
  try {
    const { employeeId, title, description, score, achievementDate } = req.body;
    const kpi = await KPI.create({
      employeeId,
      title,
      description,
      score,
      achievementDate,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: kpi });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getKPIs = async (req, res) => {
  try {
    const { employeeId } = req.query;
    let query = {};
    if (employeeId) {
      query.employeeId = employeeId;
    } else {
      if (req.user.role === 'Employee (General User)') {
        query.employeeId = req.user._id;
      }
    }
    const kpis = await KPI.find(query)
      .populate('employeeId', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role')
      .sort({ achievementDate: -1 });
    res.json({ success: true, data: kpis });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- 7. PARTNERSHIPS & BENEFITS SUGGESTIONS ---
exports.createPartnership = async (req, res) => {
  try {
    const { companyName, category, benefitDetails, contactInfo, expiryDate } = req.body;
    const partnership = await Partnership.create({
      companyName,
      category: category || 'Other',
      benefitDetails,
      contactInfo: contactInfo || '',
      expiryDate: expiryDate || null,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: partnership });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPartnerships = async (req, res) => {
  try {
    const partnerships = await Partnership.find()
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: partnerships });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createSuggestion = async (req, res) => {
  try {
    const { title, category, details } = req.body;
    if (!title || !details) {
      return res.status(400).json({ message: 'Title and details are required.' });
    }
    const suggestion = await BenefitSuggestion.create({
      submittedBy: req.user._id,
      title,
      category: category || 'Other',
      details
    });
    res.status(201).json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = await BenefitSuggestion.find()
      .populate('submittedBy', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateSuggestionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const suggestion = await BenefitSuggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }
    suggestion.status = status;
    suggestion.reviewedBy = req.user._id;
    suggestion.reviewedAt = new Date();
    await suggestion.save();
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- 8. AUX REPORT ---
exports.getAuxReport = async (req, res) => {
  try {
    const { userId, from, to } = req.query;
    const start = from ? new Date(from) : (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
    const end = to ? new Date(to) : new Date();

    const query = { startedAt: { $gte: start, $lte: end } };
    if (userId) query.userId = userId;

    const logs = await AuxLog.find(query)
      .populate('userId', 'firstName lastName role department shift')
      .sort({ startedAt: 1 });

    // Group by user
    const byUser = {};
    logs.forEach(l => {
      const uid = l.userId?._id?.toString();
      if (!uid) return;
      if (!byUser[uid]) {
        byUser[uid] = {
          user: l.userId,
          totals: { Live: 0, Break: 0, Training: 0, 'Logged out': 0 },
          logs: []
        };
      }
      const mins = l.durationMinutes ?? (l.endedAt ? Math.round((l.endedAt - l.startedAt) / 60000) : Math.round((Date.now() - l.startedAt) / 60000));
      byUser[uid].totals[l.status] = (byUser[uid].totals[l.status] || 0) + mins;
      byUser[uid].logs.push({ status: l.status, startedAt: l.startedAt, endedAt: l.endedAt, durationMinutes: mins });
    });

    // Attach schedule targets
    const month = start.toISOString().slice(0, 7);
    const schedules = await AuxSchedule.find({ month });
    const scheduleMap = {};
    schedules.forEach(s => { scheduleMap[s.userId.toString()] = s; });

    const report = Object.values(byUser).map(entry => {
      const uid = entry.user._id.toString();
      const sched = scheduleMap[uid];
      // Count working days in range
      let workDays = 0;
      const cur = new Date(start);
      while (cur <= end) {
        const day = cur.toLocaleDateString('en-US', { weekday: 'long' });
        const offDays = entry.user.weeklyOffDays || ['Friday', 'Saturday'];
        if (!offDays.includes(day)) workDays++;
        cur.setDate(cur.getDate() + 1);
      }
      const plannedLive     = sched ? sched.monthlyPlan.liveMinutes * workDays : null;
      const plannedBreak    = sched ? sched.monthlyPlan.breakMinutes * workDays : null;
      const plannedTraining = sched ? sched.monthlyPlan.trainingMinutes * workDays : null;
      const plannedCoaching = sched ? sched.monthlyPlan.coachingMinutes * workDays : null;
      return {
        ...entry,
        schedule: sched || null,
        workDays,
        planned: { liveMinutes: plannedLive, breakMinutes: plannedBreak, trainingMinutes: plannedTraining, coachingMinutes: plannedCoaching },
        compliance: {
          live:     plannedLive     ? Math.round((entry.totals.Live / plannedLive) * 100)         : null,
          break:    plannedBreak    ? Math.round((entry.totals.Break / plannedBreak) * 100)        : null,
          training: plannedTraining ? Math.round((entry.totals.Training / plannedTraining) * 100)  : null,
          coaching: plannedCoaching ? Math.round(((entry.totals.Coaching||0) / plannedCoaching) * 100) : null,
        }
      };
    });

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// --- 9. AUX SCHEDULE (Monthly + Weekly Overrides) ---
exports.upsertAuxSchedule = async (req, res) => {
  try {
    const { userId, month, monthlyPlan, weeklyOverrides } = req.body;
    const isHR = ['HRM System Administrator', 'HR Manager', 'Super CRM Administrator',
      'Attendance and Time Officer'].includes(req.user.role);
    if (!isHR) return res.status(403).json({ message: 'Not authorized.' });

    const schedule = await AuxSchedule.findOneAndUpdate(
      { userId, month },
      { userId, month, monthlyPlan, weeklyOverrides: weeklyOverrides || [], updatedBy: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!schedule.createdBy) { schedule.createdBy = req.user._id; await schedule.save(); }
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAuxSchedules = async (req, res) => {
  try {
    const { month, userId } = req.query;
    const query = {};
    if (month) query.month = month;
    if (userId) query.userId = userId;
    const schedules = await AuxSchedule.find(query)
      .populate('userId', 'firstName lastName role department shift weeklyOffDays')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.copyScheduleToNextMonth = async (req, res) => {
  try {
    const { employeeId, month } = req.body;
    const isHR = ['HRM System Administrator', 'HR Manager', 'Super CRM Administrator'].includes(req.user.role);
    const isOwnSchedule = req.user._id.toString() === employeeId?.toString();
    if (!isHR && !isOwnSchedule) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const [y, m] = month.split('-').map(Number);
    const nextMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (m === 12) nextMonth = `${y + 1}-01`;

    const source = await DetailedSchedule.findOne({ employeeId, month });
    if (!source) {
      return res.status(404).json({ message: 'Source schedule not found for the selected month.' });
    }

    const existing = await DetailedSchedule.findOne({ employeeId, month: nextMonth });
    if (existing) {
      return res.status(409).json({ message: 'Schedule already exists for next month. Update it manually.' });
    }

    const copy = await DetailedSchedule.create({
      employeeId,
      month: nextMonth,
      defaultShift: source.defaultShift,
      defaultOffDays: source.defaultOffDays,
      defaultLiveTarget: source.defaultLiveTarget,
      defaultBreakTarget: source.defaultBreakTarget,
      defaultTrainingTarget: source.defaultTrainingTarget,
      defaultCoachingTarget: source.defaultCoachingTarget,
      weeklyOverrides: source.weeklyOverrides,
      dailyOverrides: source.dailyOverrides,
      createdBy: req.user._id
    });

    res.json({ success: true, data: copy, message: `Schedule copied to ${nextMonth}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.sendScheduleReminders = async (req, res) => {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;

    const employees = await User.find({ isActive: true });
    let remindersSent = 0;

    for (const emp of employees) {
      const existing = await DetailedSchedule.findOne({ employeeId: emp._id, month: nextMonth });
      if (!existing) {
        await Email.create({
          senderId: req.user._id,
          recipientId: emp._id,
          subject: `Reminder: Please set your schedule for ${nextMonth}`,
          body: `Dear ${emp.firstName},\n\nPlease set your work schedule for ${nextMonth} before the month starts.\n\nGo to Personal Department > Profile & Schedule to update your schedule.\n\nBest regards,\nHR Department`
        });
        remindersSent++;
      }
    }

    res.json({ success: true, message: `Sent ${remindersSent} schedule reminders for ${nextMonth}.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- 10. SCHEDULE CHANGE LOGS ---
exports.getScheduleChangeLogs = async (req, res) => {
  try {
    const { employeeId, changedBy, changeSource, month, from, to } = req.query;
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (changedBy) query.changedBy = changedBy;
    if (changeSource) query.changeSource = changeSource;
    if (month) query.month = month;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const logs = await ScheduleChangeLog.find(query)
      .populate('employeeId', 'firstName lastName role department')
      .populate('changedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
