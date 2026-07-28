const mongoose = require("mongoose");
const { EVALUATION_PERIODS } = require("../utils/instituteEnums");

// Periodic student evaluation report (spec §7). File may be PDF/JPG/PNG;
// guardian view is tracked via guardianViewedAt.
const evaluationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },

    periodType: { type: String, enum: EVALUATION_PERIODS, required: true },
    fileUrl: { type: String, required: true },
    notes: { type: String },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guardianViewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evaluation", evaluationSchema);
