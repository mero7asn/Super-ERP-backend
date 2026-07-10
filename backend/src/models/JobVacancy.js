const mongoose = require('mongoose');

const jobVacancySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    default: ''
  },
  salaryRange: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open'
  }
}, { timestamps: true });

module.exports = mongoose.model('JobVacancy', jobVacancySchema);
