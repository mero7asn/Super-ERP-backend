const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (In a real app, only Super Admin might create users, but we leave it public for initial setup)
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, roleName, title } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: roleName,
      title: title || ''
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        title: user.title,
        permissions: user.permissions,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email and explicitly select password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      smtpHost: user.smtpHost,
      smtpPort: user.smtpPort,
      smtpSecure: user.smtpSecure,
      smtpUser: user.smtpUser,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        smtpHost: user.smtpHost,
        smtpPort: user.smtpPort,
        smtpSecure: user.smtpSecure,
        smtpUser: user.smtpUser,
        isActive: user.isActive,
        title: user.title,
        department: user.department,
        supervisor: user.supervisor,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).populate('supervisor', 'firstName lastName email role');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get teams (full org hierarchy)
// @route   GET /api/auth/teams
// @access  Private
exports.getTeams = async (req, res) => {
  try {
    const scope = req.query.scope === 'mine' ? 'mine' : 'all';

    // Hierarchy definition
    const HIERARCHY = [
      { department: 'Sales',            managerRole: 'Sales Manager',            memberRoles: ['Sales Agent'] },
      { department: 'Customer Support', managerRole: 'Customer Support Manager', memberRoles: ['Customer Support Agent'] },
      { department: 'Marketing',        managerRole: 'Marketing Manager',        memberRoles: ['Marketing Specialist'] },
      { department: 'Technology',       managerRole: 'System Architect',         memberRoles: ['CRM Developer', 'CRM Consultant'] },
      { department: 'Personal',         managerRole: 'HR Manager',               memberRoles: ['HR Specialist (Generalist)', 'Employee (General User)'] },
      { department: 'Payroll',          managerRole: 'HR Manager',               memberRoles: ['Payroll Specialist'] },
      { department: 'Training',         managerRole: 'Training and Development Specialist', memberRoles: [] },
      { department: 'Talent Acquisition', managerRole: 'Recruitment Specialist (Talent Acquisition)', memberRoles: [] },
      { department: 'BD & People Culture', managerRole: 'HR Business Partner',  memberRoles: [] },
    ];

    // Roles that report directly to Executive User (no sub-teams)
    const EXEC_DIRECT_ROLES = [
      'Super CRM Administrator', 'Business Analyst', 'Sales Manager', 'Marketing Manager',
      'Customer Support Manager', 'System Architect', 'HRM System Administrator', 'HR Manager'
    ];

    const allManagerRoles = HIERARCHY.map(h => h.managerRole);
    const allMemberRoles  = HIERARCHY.flatMap(h => h.memberRoles);
    const execDirectRoles = ['Super CRM Administrator', 'Business Analyst', 'HRM System Administrator'];

    const [executives, managers, members, execDirects] = await Promise.all([
      User.find({ role: 'Executive User' }).select('firstName lastName email role isActive'),
      User.find({ role: { $in: allManagerRoles } }).select('firstName lastName email role isActive supervisor')
        .populate('supervisor', 'firstName lastName email role'),
      User.find({ role: { $in: allMemberRoles } }).select('firstName lastName email role isActive supervisor')
        .populate('supervisor', 'firstName lastName email role'),
      User.find({ role: { $in: execDirectRoles } }).select('firstName lastName email role isActive supervisor')
        .populate('supervisor', 'firstName lastName email role'),
    ]);

    // Build department teams
    const teams = managers.map(manager => {
      const dept = HIERARCHY.find(h => h.managerRole === manager.role);
      return {
        manager,
        department: dept?.department || 'Other',
        memberRoles: dept?.memberRoles || [],
        members: members.filter(m => m.supervisor?._id?.toString() === manager._id.toString()),
      };
    });

    // Build executive node
    const execNode = executives.map(exec => ({
      executive: exec,
      directReports: [
        ...managers.filter(m => m.supervisor?._id?.toString() === exec._id.toString()),
        ...execDirects.filter(m => m.supervisor?._id?.toString() === exec._id.toString()),
      ],
    }));

    const unassignedMembers  = members.filter(m => !m.supervisor);
    const unassignedManagers = managers.filter(m => !m.supervisor);
    const unassignedDirects  = execDirects.filter(m => !m.supervisor);

    if (scope === 'mine') {
      const meId = req.user._id.toString();
      // For a manager: only their own team. For a member: the team whose
      // manager is their supervisor. For an exec: their own node. For an
      // exec-direct role: the node where they appear as a direct report.
      const myManagerTeam = teams.filter(t =>
        t.manager._id.toString() === meId ||
        t.members.some(m => m._id.toString() === meId) ||
        (t.manager.supervisor && t.manager.supervisor._id && t.manager.supervisor._id.toString() === meId)
      );
      const myExecNode = execNode.filter(n =>
        n.executive._id.toString() === meId ||
        n.directReports.some(r => r._id.toString() === meId)
      );
      // A member's team is the team managed by their supervisor.
      const mySupervisorId = (() => {
        const asMember = members.find(m => m._id.toString() === meId);
        if (asMember?.supervisor?._id) return asMember.supervisor._id.toString();
        const asExecDirect = execDirects.find(m => m._id.toString() === meId);
        if (asExecDirect?.supervisor?._id) return asExecDirect.supervisor._id.toString();
        return null;
      })();
      const supervisorTeam = mySupervisorId
        ? teams.filter(t => t.manager._id.toString() === mySupervisorId)
        : [];

      const mineTeams = [...myManagerTeam, ...supervisorTeam];
      const seen = new Set();
      const dedupe = mineTeams.filter(t => {
        const k = t.manager._id.toString();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      return res.json({
        success: true,
        scope: 'mine',
        teams: dedupe,
        execNode: myExecNode,
        unassignedMembers: scope === 'mine' ? [] : unassignedMembers,
        unassignedManagers: [],
        unassignedDirects: [],
        hierarchy: HIERARCHY,
      });
    }

    res.json({
      success: true,
      scope: 'all',
      teams,
      execNode,
      unassignedMembers,
      unassignedManagers,
      unassignedDirects,
      hierarchy: HIERARCHY,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user by ID
// @route   PUT /api/auth/users/:id
// @access  Private — own profile (basic fields) or Admin (all fields)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwnProfile = req.user._id.toString() === req.params.id;

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this profile' });
    }

    // Fields anyone can edit on their own profile
    if (isOwnProfile || isAdmin) {
      if (req.body.firstName) user.firstName = req.body.firstName;
      if (req.body.lastName) user.lastName = req.body.lastName;
      if (req.body.email) user.email = req.body.email;
      if (req.body.password && req.body.password.trim() !== '') {
        user.password = req.body.password;
      }
      if (req.body.smtpHost !== undefined) user.smtpHost = req.body.smtpHost;
      if (req.body.smtpPort !== undefined) user.smtpPort = req.body.smtpPort;
      if (req.body.smtpSecure !== undefined) user.smtpSecure = req.body.smtpSecure;
      if (req.body.smtpUser !== undefined) user.smtpUser = req.body.smtpUser;
      if (req.body.smtpPass !== undefined && req.body.smtpPass.trim() !== '') {
        user.smtpPass = req.body.smtpPass;
      }
    }

    // Admin-only fields
    if (isAdmin) {
      if (req.body.role) user.role = req.body.role;
      if (req.body.title !== undefined) user.title = req.body.title;
      if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
      if (req.body.supervisor !== undefined) user.supervisor = req.body.supervisor || null;
      if (req.body.permissions) {
        Object.entries(req.body.permissions).forEach(([key, val]) => {
          user.permissions[key] = val;
        });
        user.markModified('permissions');
      }
    }

    const updated = await user.save();
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single user by ID
// @route   GET /api/auth/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwnProfile = req.user._id.toString() === req.params.id;

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    const user = await User.findById(req.params.id).populate('supervisor', 'firstName lastName email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get minimal users list (public to authenticated users for email dropdown)
// @route   GET /api/auth/users-list
// @access  Private
exports.getUsersList = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('firstName lastName email role');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Test SMTP connection for a user
// @route   POST /api/auth/users/:id/verify-smtp
// @access  Private (own profile or admin)
exports.verifySmtp = async (req, res) => {
  try {
    const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(req.user.role);
    const isOwnProfile = req.user._id.toString() === req.params.id;
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { verifyTransporter, getGlobalEmailConfig } = require('../services/emailService');
    const { createTransporter } = require('../services/emailService');

    // If caller sends override credentials (test-before-save), use those directly
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body || {};

    let testUser;
    if (smtpHost && smtpUser && smtpPass) {
      // Test with provided credentials without touching the database
      testUser = {
        smtpHost,
        smtpPort: smtpPort || 587,
        smtpSecure: smtpSecure || false,
        smtpUser,
        getSmtpPass: () => smtpPass,
      };
    } else {
      // Use saved credentials — must select +smtpPass since it's excluded by default
      testUser = await User.findById(req.params.id).select('+smtpPass');
      if (!testUser) return res.status(404).json({ message: 'User not found' });
      if (!testUser.smtpHost || !testUser.smtpUser || !testUser.smtpPass) {
        return res.json({
          success: false,
          message: 'SMTP is not fully configured. Make sure Host, Username, and Password are all saved.'
        });
      }
    }

    const globalConfig = await getGlobalEmailConfig();
    const result = await verifyTransporter(testUser, globalConfig);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
