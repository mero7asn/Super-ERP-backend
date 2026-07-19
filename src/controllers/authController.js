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

    // Surface the platform business model so the client can configure the UI.
    let businessModel = 'service';
    try {
      const SystemSetting = require('../models/SystemSetting');
      const setting = await SystemSetting.findOne({ key: 'businessModel' });
      if (setting?.value) businessModel = setting.value;
    } catch (settingErr) {
      console.error('Failed to load business model setting:', settingErr.message);
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      onboarded: !!user.onboarded,
      businessModel,
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

    let businessModel = 'service';
    try {
      const SystemSetting = require('../models/SystemSetting');
      const setting = await SystemSetting.findOne({ key: 'businessModel' });
      if (setting?.value) businessModel = setting.value;
    } catch (settingErr) {
      console.error('Failed to load business model setting:', settingErr.message);
    }

    res.json({
      ...user.toObject(),
      onboarded: !!user.onboarded,
      businessModel,
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

    res.json({
      success: true,
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
