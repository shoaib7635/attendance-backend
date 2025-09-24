const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  CNIC: { type: String, required: false, default: null },
  rollNumber: { type: String, required: true,  unique: true }, // 🎯 Roll number field add
  attendance: [
    {
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ["Present", "Absent"], default: "Absent" }
    }
  ]
});

module.exports = mongoose.model("Student", studentSchema);
