const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  name: String,
  date: String,
  status: String // Present, Absent, Late
});

module.exports = mongoose.model('Attendance', attendanceSchema);
