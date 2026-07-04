const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed', 'Paused', 'Canceled'],
    default: 'Open'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  affectedPage: {
    type: String,
    enum: [
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
    ],
    default: 'Other'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  requesterTeam: {
    type: String,
    default: ''
  },
  targetTeam: {
    type: String,
    default: 'Technology Team'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
