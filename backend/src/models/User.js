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
      'Executive User'
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
  }
}, { timestamps: true });

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
