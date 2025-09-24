  const express = require("express");
  const mongoose = require("mongoose");
  const cors = require("cors");
  const cron = require("node-cron");
  const User = require("./models/user");
  const Student = require("./models/Student");
  const Attendance = require("./models/Attendance");
  const multer = require("multer");
  const upload = multer({ dest: "uploads/" });

const csv = require("csv-parser");
const fs = require("fs");

  const app = express();
  const PORT = 4000;

  app.use(cors());
  app.use(express.json());

  // MongoDB connection
  mongoose.connect("mongodb+srv://Shoaib:Malik7635@cluster0.jpwreoi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => {
      console.log("✅ MongoDB Atlas connected");
      makeExistingUserAdmin(); // Make existing user admin
    })
    .catch(err => console.log("❌ Error connecting MongoDB Atlas:", err));


  // 🔥 EXISTING USER KO ADMIN BANANE KE LIYE 🔥
  const makeExistingUserAdmin = async () => {
    try {
      // YAHAN APNI EXISTING USER KI EMAIL DALEEN
      const existingUserEmail = "hrfutureit@gmail.com"; // ⬅️ APNI EMAIL YAHAN
      
      const user = await User.findOneAndUpdate(
        { email: existingUserEmail },
        { role: "admin" },
        { new: true }
      );
     console.log(user)
      if (user) {
        console.log(`🚀 EXISTING USER UPDATED TO ADMIN:`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Username: ${user.username}`);
        console.log(`🔑 Role: ${user.role}`);
      } else {
        console.log(`❌ User not found with email: ${existingUserEmail}`);
        console.log(`💡 Please check email or create new user first`);
      }
    } catch (error) {
      console.log("❌ Error updating user to admin:", error.message);
    }
  };

  // Signup route - Normal users (NOT admin by default)
  app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
      const exists = await User.findOne({ $or: [{ username }, { email }] });
      if (exists) return res.status(400).json({ message: "Username or Email already exists" });

      // Create normal user (role: "user" by default)
      const user = new User({ 
        username, 
        email, 
        password,
        role: "user" // Regular users are NOT admin
      });
      await user.save();
      res.status(201).json({ 
        message: "User registered successfully (Not Admin)",
        user: { username: user.username, email: user.email, role: user.role }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Login route - Only admin access allowed
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email, password });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });

      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
      }

      res.json({
        data: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        },
        message: "Admin login successful"
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // 🎯 ADMIN MANAGEMENT ROUTES 🎯

  // 1. Get all users (Admin only)
  app.get("/all-users", async (req, res) => {
    try {
      const users = await User.find({}, { password: 0 }); // Don't show passwords
      res.json({ 
        totalUsers: users.length,
        users: users.map(user => ({
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isAdmin: user.role === "admin"
        }))
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // 2. Make user admin by email
  app.post("/make-admin", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await User.findOneAndUpdate(
        { email },
        { role: "admin" },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found with this email" });
      }

      res.json({ 
        message: `✅ ${user.username} (${email}) is now ADMIN!`,
        user: { 
          username: user.username, 
          email: user.email, 
          role: user.role,
          _id: user._id
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // 3. Make user admin by ID
  app.post("/make-admin-by-id", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role: "admin" },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found with this ID" });
      }

      res.json({ 
        message: `✅ ${user.username} is now ADMIN!`,
        user: { 
          username: user.username, 
          email: user.email, 
          role: user.role,
          _id: user._id
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // 4. Remove admin access
  app.post("/remove-admin", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await User.findOneAndUpdate(
        { email },
        { role: "user" },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: `❌ ${user.username} admin access removed!`,
        user: { 
          username: user.username, 
          email: user.email, 
          role: user.role 
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // 5. Create new admin directly
  app.post("/create-admin", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email and password required" });
      }

      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.status(400).json({ message: "Email or Username already exists" });
      }

      const admin = new User({
        username,
        email, 
        password,
        role: "admin"
      });

      await admin.save();
      res.json({ 
        message: "🚀 New Admin created successfully!", 
        admin: { 
          username: admin.username, 
          email: admin.email, 
          role: admin.role,
          _id: admin._id
        } 
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // 6. Bulk make admins (Multiple users at once)
  app.post("/make-multiple-admins", async (req, res) => {
    try {
      const { emails } = req.body; // Array of emails
      
      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({ message: "Emails array required" });
      }

      const results = [];
      
      for (let email of emails) {
        try {
          const user = await User.findOneAndUpdate(
            { email },
            { role: "admin" },
            { new: true }
          );
          
          if (user) {
            results.push({
              email,
              status: "success",
              message: `${user.username} is now admin`,
              user: { username: user.username, email: user.email, role: user.role }
            });
          } else {
            results.push({
              email,
              status: "failed",
              message: "User not found"
            });
          }
        } catch (error) {
          results.push({
            email,
            status: "error",
            message: error.message
          });
        }
      }

      res.json({ 
        message: "Bulk admin update completed",
        results
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

    // Roll number generate function
const generateRollNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `${year}-FIT-`;

  let count = await Student.countDocuments({ rollNumber: { $regex: `^${prefix}` } });
  let rollNumber;
  let exists;

  do {
    rollNumber = `${prefix}${count + 1}`;
    exists = await Student.findOne({ rollNumber });
    count++;
  } while (exists);

  return rollNumber;
};


  // Add student
 // Add student
app.post("/addstudent", async (req, res) => {
  try {
    const { name, course, userId, CNIC } = req.body;

    if (!name || !course || !userId) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existing = await Student.findOne({ CNIC, userId });
    if (existing) {
      return res.status(400).json({ message: "Student with this CNIC already exists." });
    }


    // Generate roll number
    const rollNumber = await generateRollNumber();

    const newStudent = new Student({
      name,
      course,
      userId,
      CNIC: CNIC || null,
      rollNumber,   // 🎯 Add roll number
      attendance: [] 
    });
    await newStudent.save();
    res.status(201).json({ message: "Student added successfully", student: newStudent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

  // GET all students
  app.get("/students", async (req, res) => {
    try {
      const students = await Student.find(); 
      res.json({ students });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark Attendance
  app.post("/mark-attendance", async (req, res) => {
    const { userId, status, date } = req.body;

    try {
      const student = await Student.findById(userId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      let attendance = await Attendance.findOne({ student: student._id, date });

      if (attendance) {
        attendance.status = status;
        attendance.name = student.name;
        attendance.course = student.course;
        attendance.CNIC = student.CNIC;
        attendance.rollNumber = student.rollNumber;
        await attendance.save();
      } else {
        await new Attendance({
          student: student._id,
          name: student.name,
          course: student.course,
          CNIC: student.CNIC,
          rollNumber: student.rollNumber,
          status,
          date
        }).save();
      }

      res.json({ message: "Attendance marked successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get Attendance Report
  app.get("/attendance-report", async (req, res) => {
    const { date } = req.query;

    try {
      const attendanceRecords = await Attendance.find({ date }).populate("student", "name course CNIC rollNumber");
      
      const present = [];
      const absent = [];
      
      attendanceRecords.forEach(record => {
      const attendanceData = {
    _id: record._id,
    status: record.status,
    date: record.date,
    student: record.student ? {
      _id: record.student._id,
      name: record.student.name,
      course: record.student.course,
      CNIC: record.student.CNIC,
      rollNumber: record.student.rollNumber
    } : {
      _id: record.student,
      name: record.name || "Deleted Student",
      course: record.course || "Unknown Course",
      CNIC: record.CNIC || "Unknown",
      rollNumber: "Unknown",
      isDeleted: true
    }
  };
      
        if (record.status === "Present") {
          present.push(attendanceData);
        } else {
          absent.push(attendanceData);
        }
      });

      res.json({ present, absent });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Mark all students absent
  app.post("/mark-all-absent", async (req, res) => {
    const { date } = req.body;

    try {
      const students = await Student.find();
      for (const student of students) {
        const existing = await Attendance.findOne({ student: student._id, date });
        if (!existing) {
          await new Attendance({
            student: student._id,
            name: student.name,
            course: student.course,
            CNIC: student.CNIC,
            rollNumber: student.rollNumber,
            status: "Absent",
            date
          }).save();
        }
      }

      res.json({ message: "All students marked absent for today" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Auto mark absent at midnight
  cron.schedule("0 0 * * *", async () => {
    const today = new Date().toISOString().split("T")[0];
    const students = await Student.find();
    
    for (const student of students) {
      const alreadyMarked = await Attendance.findOne({ student: student._id, date: today });
      if (!alreadyMarked) {
        await new Attendance({ 
          student: student._id, 
          name: student.name,
          course: student.course,
          status: "Absent", 
          date: today 
        }).save();
      }
    }

    console.log(`✅ Auto absent marked for ${today}`);
  });

  // Delete student
  app.delete("/delete-student/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const student = await Student.findById(id);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      await Attendance.updateMany(
        { student: id },
        { 
          name: student.name,
          course: student.course
        }
      );

      await Student.findByIdAndDelete(id);
      
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get attendance by student name or CNIC
  app.get("/attendance-by-student", async (req, res) => {
    const { query } = req.query; // query can be name or CNIC
    if (!query) return res.status(400).json({ message: "Query is required" });

    try {
      const regex = new RegExp(query, "i"); // case-insensitive partial match

      // Find all matching students
      const students = await Student.find({
        $or: [
          { name: regex },
          { CNIC: regex }
        ]
      });

      // Find all attendance records for matched students
      const records = await Attendance.find({ student: { $in: students.map(s => s._id) } })
          .populate("student", "name course CNIC rollNumber")
          .sort({ date: 1 });

      const mappedRecords = records.map(r => ({
        ...r._doc,
        student: r.student ? {
          _id: r.student._id,
          name: r.student.name,
          course: r.student.course,
          CNIC: r.student.CNIC,
          rollNumber: r.student.rollNumber
        } : {
          name: r.name,
          course: r.course,
          CNIC: r.CNIC || "Unknown",
          rollNumber: "Unknown",
          isDeleted: true
        }
      }));

      res.json(mappedRecords);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get attendance by student ID (month + date wise)
  app.get("/student-attendance/:studentId", async (req, res) => {
    const { studentId } = req.params;

    try {
      const records = await Attendance.find({ student: studentId })
        .sort({ date: 1 });

      const monthMap = {};

      records.forEach(r => {
        const [year, month] = r.date.split("-"); // YYYY-MM-DD
        const key = `${year}-${month}`;

        if (!monthMap[key]) monthMap[key] = { present: 0, absent: 0, records: [] };

        if (r.status === "Present") monthMap[key].present++;
        else monthMap[key].absent++;

        monthMap[key].records.push({
          date: r.date,
          status: r.status
        });
      });

      res.json({ monthWise: monthMap, dateWise: records });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // CSV import route

app.post("/import-csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file required" });

    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", async (data) => {

        const rollNumber = await generateRollNumber(); 
        // Map CSV columns to MongoDB fields
        results.push({
          name: data.name,
          course: data.course,
          userId: data.userId, // Excel ya CSV me userId column hona chahiye
          CNIC: data.CNIC || null,
          rollNumber, 
          attendance: []
        });
      })
      .on("end", async () => {
        await Student.insertMany(results);
        fs.unlinkSync(req.file.path); // Delete temporary file
        res.json({ message: "CSV imported successfully", total: results.length });
      });

  } catch (err) {
    res.status(500).json({ message: "Error importing CSV", error: err.message });
  }
});


  // Test route
  app.get("/", (req, res) => res.send("🚀 Admin Management System Running"));

  app.listen(PORT, () => console.log(`🌟 Server running on port ${PORT}`));