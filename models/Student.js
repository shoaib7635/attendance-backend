const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
userId: {
type: mongoose.Schema.Types.ObjectId,
ref:"User",
required:true
},
CNIC: { type: String, required: false },
  attendance: [
    {
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ["Present", "Absent"], default: "Absent" }
    }
  ]
});

module.exports = mongoose.model("Student", studentSchema);
