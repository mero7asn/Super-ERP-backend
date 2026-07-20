const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required']
  },
  title: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Do not return password by default
  },
  role: {
    type: String,
    enum: [
      'Super CRM Administrator',
      'Sales Agent',
      'Sales Manager',
      'Customer Support Agent',
      'Customer Support Manager',
      'Marketing Specialist',
      'Marketing Manager',
      'Business Analyst',
      'CRM Developer',
      'CRM Consultant',
      'System Architect',
      'Executive User',
      'HRM System Administrator',
      'HR Manager',
      'HR Specialist (Generalist)',
      'Recruitment Specialist (Talent Acquisition)',
      'Payroll Specialist',
      'HR Business Partner',
      'Training and Development Specialist',
      'Performance Management Specialist',
      'Attendance and Time Officer',
      'Employee (General User)',
      'HR Director / Executive HR User',
      'RTM Team Member',
      'Inventory Manager',
      'Warehouse Manager',
      'Receiving Clerk',
      'Shipping Clerk',
      'Warehouse Operator',
      'Inventory Clerk',
      'Quality Inspector'
    ],
    required: true
  },
  permissions: {
    canViewLeads: { type: Boolean, default: false },
    canEditLeads: { type: Boolean, default: false },
    canDeleteLeads: { type: Boolean, default: false },
    canViewTickets: { type: Boolean, default: false },
    canEditTickets: { type: Boolean, default: false },
    canDeleteTickets: { type: Boolean, default: false },
    canManageCampaigns: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    customPermissions: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  onboarded: {
    type: Boolean,
    default: false
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  avayaExtension: {
    type: String,
    default: null
  },
  avayaConfig: {
    server: { type: String, default: null },
    port: { type: String, default: null },
    userId: { type: String, default: null }
  },
  department: {
    type: String,
    default: ''
  },
  auxStatus: {
    type: String,
    enum: ['Live', 'Training', 'Break', 'Coaching', 'Logged out'],
    default: 'Logged out'
  },
  isPersonalTeamLeader: {
    type: Boolean,
    default: false
  },
  shift: {
    type: String,
    default: 'Day Shift (09:00 - 17:00)'
  },
  weeklyOffDays: {
    type: [String],
    default: ['Friday', 'Saturday']
  },
  rtmFlagged: {
    type: Boolean,
    default: false
  },
  rtmFlaggedAt: {
    type: Date,
    default: null
  },
  rtmFlagReason: {
    type: String,
    enum: ['Extended Live', 'Out of Shift', 'Manual', null],
    default: null
  },
  rtmSuppressUntil: {
    type: Date,
    default: null
  },
  smtpHost: {
    type: String,
    default: null
  },
  smtpPort: {
    type: Number,
    default: 587
  },
  smtpSecure: {
    type: Boolean,
    default: false
  },
  smtpUser: {
    type: String,
    default: null
  },
  smtpPass: {
    type: String,
    default: null,
    select: false
  }
}, { timestamps: true });

userSchema.methods.getSmtpPass = function() {
  return this.smtpPass;
};

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
