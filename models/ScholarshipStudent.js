const mongoose = require("mongoose");

const scholarshipStudentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  country_of_studying: { type: String, required: true },
  city: { type: String, required: true },
  university: {
    type: String,
    required: true,
  },
  type_of_university: { type: String, required: true },
  program_of_study: { type: String, required: true },
  student_university_id: { type: String, required: true },
  enrollment_year: { type: Number, required: true },
  expected_graduation_year: { type: Number, required: true },
});

const ScholarshipStudent = mongoose.model(
  "ScholarshipStudent",
  scholarshipStudentSchema
);

module.exports = ScholarshipStudent;
