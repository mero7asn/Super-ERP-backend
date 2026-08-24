const mongoose = require('mongoose');

const businessDevelopmentTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessOpportunity'
  },
  partnership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership'
  },
  dueDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('BusinessDevelopmentTask', businessDevelopmentTaskSchema);
