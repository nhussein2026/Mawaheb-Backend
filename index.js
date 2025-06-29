const express = require("express");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const courseRoutes = require("./routes/courseRoutes");
const noteRoutes = require("./routes/noteRoutes");
const userAchievementRoutes = require("./routes/userAchievementRoutes");
const eventRoutes = require("./routes/eventRoutes");
const difficultyRoutes = require("./routes/difficultyRoutes");
const studentReportRoutes = require("./routes/studentReportRoutes");
const financialReportRoutes = require("./routes/financialReportRoutes");
const statRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const scholarshipStudentRoutes = require("./routes/scholarshipStudentRouts");
const semesterRoutes = require("./routes/semesterRoutes");

require("dotenv").config();
const cors = require("cors");
const path = require("path");

const app = express();

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Enable All CORS Requests
// Configure CORS
app.use(cors());

app.use(express.json());

// Connect to MongoDB
const connectDB = require("./config/db");
connectDB();

//user rotes
app.use("/user", userRoutes);

//user rotes
app.use("/stats", statRoutes);

//user rotes
app.use("/auth", authRoutes);

//certificates rotes
app.use("/", certificateRoutes);

//course rotes
app.use("/", courseRoutes);

//notes rotes
app.use("/", noteRoutes);

// userAchievement Routes
app.use("/", userAchievementRoutes);

// event routes
app.use("/", eventRoutes);

//difficulties routes
app.use("/", difficultyRoutes);

//student report routes
app.use("/", studentReportRoutes);

//financial report routes
app.use("/", financialReportRoutes);

//scholarship student routes
app.use("/scholarship-student", scholarshipStudentRoutes);

// semester routes
app.use("/semester", semesterRoutes);

// Admin routs
app.use("/admin", adminRoutes);
// Start the server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add this after your middleware setup
app.get("/", (req, res) => {
  res.json({
    message: "API is running successfully",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
