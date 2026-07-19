const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Email = require('../models/Email');

const TECH_ROLES = ['CRM Developer', 'CRM Consultant', 'System Architect'];
const ADMIN_ROLES = ['Super CRM Administrator'];
const FULL_ACCESS_ROLES = [...TECH_ROLES, ...ADMIN_ROLES, 'Executive User'];
const CAN_MANAGE_ROLES = [...TECH_ROLES, ...ADMIN_ROLES];
const AFFECTED_PAGES = [
  'Other',
  'Dashboard',
  'Leads',
  'Lead Distribution',
  'Sales Dashboard',
  'Offers',
  'Bookings',
  'Campaigns',
  'Analytics',
  'Executive Dashboard',
  'Teams',
  'User Management',
  'User Profile',
  'Settings',
  'CRM Dev Tools'
];

const hasFullAccess = (role) => FULL_ACCESS_ROLES.includes(role);
const canManageTickets = (role) => CAN_MANAGE_ROLES.includes(role);

const populateTicket = (query) => query
  .populate('assignedTo', 'firstName lastName email role')
  .populate('createdBy', 'firstName lastName email role')
  .populate('comments.author', 'firstName lastName email role')
  .populate('customer', 'name email');

const canCommentOnTicket = (user, ticket) => (
  canManageTickets(user.role) ||
  ticket.assignedTo?.toString() === user._id.toString() ||
  ticket.createdBy?.toString() === user._id.toString()
);

// @desc    Get tickets based on role
// @route   GET /api/tickets
// @access  Private
exports.getTickets = async (req, res) => {
  try {
    let query;

    if (hasFullAccess(req.user.role)) {
      query = Ticket.find();
    } else {
      query = Ticket.find({ createdBy: req.user._id });
    }

    const tickets = await populateTicket(query.sort({ createdAt: -1 }));

    res.status(200).json({ success: true, count: tickets.length, data: tickets });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get Technology users
// @route   GET /api/tickets/technology-users
// @access  Private
exports.getTechnologyUsers = async (req, res) => {
  try {
    if (!canManageTickets(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view Technology users' });
    }

    const users = await User.find({
      role: { $in: TECH_ROLES },
      isActive: true
    }).select('firstName lastName email role isActive');

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!hasFullAccess(req.user.role) && ticket.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    const populated = await populateTicket(ticket);
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { subject, description, priority, affectedPage, customer, assignedTo } = req.body;

    if (!subject?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const canAssign = canManageTickets(req.user.role);
    const ticketPriority = canManageTickets(req.user.role) ? priority || 'Medium' : 'Medium';
    const normalizedAffectedPage = AFFECTED_PAGES.includes(affectedPage) ? affectedPage : 'Other';
    const ticket = await Ticket.create({
      subject: subject.trim(),
      description: description.trim(),
      priority: ticketPriority,
      affectedPage: normalizedAffectedPage,
      customer: customer || null,
      requesterTeam: req.user.role,
      targetTeam: 'Technology Team',
      assignedTo: canAssign ? assignedTo || null : null,
      createdBy: req.user._id
    });

    const populated = await populateTicket(ticket);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create ticket', error: error.message });
  }
};

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!canCommentOnTicket(req.user, ticket)) {
      return res.status(403).json({ message: 'Not authorized to comment on this ticket' });
    }

    ticket.comments.push({
      author: req.user._id,
      text: text.trim()
    });

    await ticket.save();

    const populated = await populateTicket(ticket);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ message: 'Failed to add comment', error: error.message });
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
exports.updateTicket = async (req, res) => {
  try {
    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const canManage = canManageTickets(req.user.role) || ticket.assignedTo?.toString() === req.user._id.toString();
    const isCreator = ticket.createdBy?.toString() === req.user._id.toString();

    if (!canManage && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to edit this ticket' });
    }

    const updates = { ...req.body };

    if (isCreator && !canManage) {
      const allowedCreatorUpdates = {};
      if (updates.description !== undefined) allowedCreatorUpdates.description = updates.description;
      if (updates.status === 'Canceled') allowedCreatorUpdates.status = 'Canceled';
      Object.assign(updates, allowedCreatorUpdates);
    }

    if (!canManageTickets(req.user.role) && updates.assignedTo !== undefined) {
      delete updates.assignedTo;
    }
    if (!canManageTickets(req.user.role) && updates.priority !== undefined) {
      delete updates.priority;
    }

    if (updates.status === 'Resolved' && ticket.status !== 'Resolved') {
      updates.resolvedAt = new Date();
    } else if (updates.status === 'Canceled' && ticket.status !== 'Canceled') {
      updates.resolvedAt = new Date();
    }

    const previousAssignee = ticket.assignedTo ? ticket.assignedTo.toString() : null;

    ticket = await Ticket.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    // Send internal email notification when assignee changes
    const newAssignee = updates.assignedTo ? updates.assignedTo.toString() : null;
    if (newAssignee && newAssignee !== previousAssignee) {
      try {
        await Email.create({
          senderId: req.user._id,
          recipientId: newAssignee,
          subject: `[Ticket Assigned] ${ticket.subject}`,
          body: `Hello,\n\nTicket #${ticket._id} has been assigned to you.\n\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nAffected Page: ${ticket.affectedPage || 'N/A'}\n\nPlease review and update the ticket status accordingly.\n\nBest regards,\n${req.user.firstName} ${req.user.lastName}`,
          fromEmail: req.user.email,
          toEmail: (await User.findById(newAssignee).select('email'))?.email || ''
        });
      } catch (notifyErr) {
        console.error('Failed to send ticket assignment notification:', notifyErr.message);
      }
    }

    const populated = await populateTicket(ticket);

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
