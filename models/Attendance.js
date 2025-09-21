const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  status: { type: String, enum: ["Present", "Absent"], required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  name: { type: String },
  rollNumber: { type: String },
  course: { type: String },
});

module.exports = mongoose.model("Attendance", attendanceSchema);