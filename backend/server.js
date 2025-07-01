const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

const MONGO_URI = 'mongodb+srv://mannambhavana313:bhavanamannam@cluster0.xys1lpi.mongodb.net/attendance-tracker?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// ====== SCHEMAS ======
const sectionSchema = new mongoose.Schema({ name: { type: String, unique: true } });
const studentSchema = new mongoose.Schema({ id: String, name: String, section: String });
const attendanceSchema = new mongoose.Schema({ studentId: String, section: String, date: Date, status: String });

const Section = mongoose.model('Section', sectionSchema);
const Student = mongoose.model('Student', studentSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// ====== SECTION ROUTES ======
app.get('/sections', async (req, res) => {
  const sections = await Section.find();
  res.json(sections.map(s => s.name));
});

app.post('/sections', async (req, res) => {
  let { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Section name is required' });

  name = name.toLowerCase();

  const exists = await Section.findOne({ name });
  if (exists) return res.status(409).json({ message: 'Section already exists' });

  await Section.create({ name });
  res.json({ message: 'Section added successfully' });
});

app.delete('/sections/:name', async (req, res) => {
  const name = req.params.name.toLowerCase();
  await Section.deleteOne({ name });
  await Student.deleteMany({ section: name });
  await Attendance.deleteMany({ section: name });
  res.json({ message: 'Section and all related data deleted permanently' });
});

// ====== STUDENT ROUTES ======
app.get('/students/:section', async (req, res) => {
  const section = req.params.section.toLowerCase();
  const students = await Student.find({ section });
  res.json(students);
});

app.post('/students', async (req, res) => {
  let { id, name, section } = req.body;
  if (!id || !name || !section) {
    return res.status(400).json({ message: 'ID, Name, and Section are required' });
  }

  id = id.toLowerCase();
  section = section.toLowerCase();

  const existingStudent = await Student.findOne({ id, section });
  if (existingStudent) return res.status(409).json({ message: 'Student already exists in this section' });

  await Student.create({ id, name, section });
  res.json({ message: 'Student added successfully' });
});

app.delete('/students/:id/:section', async (req, res) => {
  const id = req.params.id.toLowerCase();
  const section = req.params.section.toLowerCase();

  await Student.deleteOne({ id, section });
  await Attendance.deleteMany({ studentId: id, section });

  res.json({ message: 'Student and all related attendance records deleted permanently' });
});

// ====== ATTENDANCE ROUTES ======

// Mark attendance for a student on a date
app.post('/attendance/:id', async (req, res) => {
  const id = req.params.id.toLowerCase();
  const { date, section, status } = req.body;

  if (!status || !['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ message: 'Valid attendance status is required' });
  }

  const sectionLower = section.toLowerCase();
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  const student = await Student.findOne({ id, section: sectionLower });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const existing = await Attendance.findOne({ studentId: id, section: sectionLower, date: parsedDate });

  if (existing) {
    existing.status = status;
    await existing.save();
    return res.json({ message: 'Attendance updated successfully' });
  }

  await Attendance.create({ studentId: id, section: sectionLower, date: parsedDate, status });
  res.json({ message: 'Attendance marked successfully' });
});

// Get attendance for a section on a specific day
app.get('/attendance-status/:section/:date', async (req, res) => {
  const { section, date } = req.params;
  const sectionLower = section.toLowerCase();
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  const students = await Student.find({ section: sectionLower });
  const attendance = await Attendance.find({ section: sectionLower, date: parsedDate });

  const statusMap = {};
  attendance.forEach(rec => {
    statusMap[rec.studentId] = rec.status;
  });

  const result = students.map(stu => ({
    id: stu.id,
    name: stu.name,
    status: statusMap[stu.id] || 'Not Marked',
  }));

  res.json(result);
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
