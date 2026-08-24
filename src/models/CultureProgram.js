const mongoose = require('mongoose');

const cultureProgramSchema = new mongoose.Schema({
  programId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Employee Recognition', 'Team Building', 'Wellness Programs', 'Learning Programs', 'Company Events', 'CSR Activities', 'Employee Engagement', 'Innovation Programs', 'Employee Appreciation', 'Internal Campaigns', 'Other'],
    default: 'Employee Engagement'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  objective: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  targetEmployees: {
    type: String,
    enum: ['All Employees', 'Specific Department', 'Specific Location', 'Selected Employees'],
    default: 'All Employees'
  },
  targetDepartments: [{
    type: String
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  budget: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Planned', 'Active', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  participationCount: {
    type: Number,
    default: 0
  },
  expectedParticipants: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  results: {
    type: String,
    default: ''
  },
  feedback: {
    type: String,
    default: ''
  }
}, { timestamps: true });

cultureProgramSchema.pre('save', function(next) {
  if (!this.programId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.programId = `CPG-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.model('CultureProgram', cultureProgramSchema);
