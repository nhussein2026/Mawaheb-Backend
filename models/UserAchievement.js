const mongoose = require("mongoose");
const { ACHIEVEMENT_REVIEW_STATUSES } = require("../utils/instituteEnums");

// Unified achievement (spec §12). Self-logged scholarship/general achievements
// keep `reviewStatus: "none"` (no judging). Institute-submitted achievements
// default to "pending" and flow through the judging screen; approving one feeds
// the dashboard "approved achievements" stat.
const userAchievementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: [
        "Project",
        "Prize",
        "Certificate",
        "Innovation",
        "Research Paper",
        "Volunteering Activity",
        "Other",
        "مشروع",
        "جائزة",
        "شهادة",
        "ابتكار",
        "ورقة بحثية",
        "نشاط تطوعي",
        "أخرى",
      ],
    },
    achievement_image: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── institute judging workflow (spec §12) ─────────────────
    fileUrl: { type: String }, // supporting file for institute-submitted achievements
    reviewStatus: {
      type: String,
      enum: ACHIEVEMENT_REVIEW_STATUSES,
      default: "none",
    },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    feedback: { type: String }, // visible to the student
    reviewedAt: { type: Date },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

const UserAchievement = mongoose.model(
  "UserAchievement",
  userAchievementSchema
);

module.exports = UserAchievement;
