const mongoose = require("mongoose");
const {
  RESULT_TERMS,
  RESULT_EXAM_TYPES,
  RESULT_CLASSIFICATIONS,
} = require("../utils/instituteEnums");

// Uploaded/approved grade-sheet for a student (spec §6). Stored as an image;
// guardian view is tracked via guardianViewedAt.
const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },

    term: { type: String, enum: RESULT_TERMS, required: true },
    examType: { type: String, enum: RESULT_EXAM_TYPES, required: true },
    classification: { type: String, enum: RESULT_CLASSIFICATIONS },

    imageUrl: { type: String, required: true }, // grade-sheet image (JPG/PNG)

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guardianViewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", resultSchema);
