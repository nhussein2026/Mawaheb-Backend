const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema({
  semesterNumber: { type: Number, required: true },
  courses: [
    {
      courseCode: { type: String, required: true },
      courseName: { type: String, required: true },
      grade: { type: Number, required: true },
      credits: { type: Number, required: true },
      ects: { type: Number, required: true },
      lg: {
        type: String,
        enum: ["AA", "AB", "BA", "BB", "CB", "CC", "DC", "DD", "FF"],
        required: true,
      },
    },
  ],
  resultImage: { type: String },
  semesterGPA: { type: Number, default: 0 },
  totalGpa: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Semester = mongoose.model("Semester", semesterSchema);

module.exports = Semester;
