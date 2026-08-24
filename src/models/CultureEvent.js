const mongoose = require('mongoose');

const cultureEventSchema = new mongoose.Schema({
  eventId: {
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
    enum: ['Company Event', 'Team Building', 'Birthday Event', 'Recognition Event', 'Training Activity', 'Wellness Activity', 'Community Event', 'Workshop', 'Seminar', 'Other'],
    default: 'Company Event'
  },
  date: {
    type: Date
  },
  time: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  capacity: {
    type: Number,
    default: 0
  },
  targetAudience: {
    type: String,
    enum: ['All Employees', 'Specific Department', 'Selected Employees'],
    default: 'All Employees'
  },
  targetDepartments: [{
    type: String
  }],
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: {
    type: Date
  },
  participantCount: {
    type: Number,
    default: 0
  },
  budget: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Upcoming', 'Registration Open', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

cultureEventSchema.pre('save', function(next) {
  if (!this.eventId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.eventId = `EVT-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.model('CultureEvent', cultureEventSchema);
