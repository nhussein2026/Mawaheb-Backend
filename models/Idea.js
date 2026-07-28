const mongoose = require("mongoose");
const { IDEA_STATUSES } = require("../utils/instituteEnums");

// Strategic idea proposal submitted by a student (spec §13). On approval the
// awarded reward points are injected into InstituteStudent.ideasBankBalance
// (handled in the controller).
const ideaSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String, required: true }, // موضوع الفكرة
    description: { type: String },

    status: { type: String, enum: IDEA_STATUSES, default: "under_study" },
    rewardPoints: { type: Number, default: 0 }, // granted on approval
    pointsAwarded: { type: Boolean, default: false }, // guard against double-inject
    notes: { type: String }, // judging notes (visible to student)

    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },

    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Idea", ideaSchema);
