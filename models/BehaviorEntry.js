const mongoose = require("mongoose");
const { BEHAVIOR_TYPES } = require("../utils/instituteEnums");

// Positive/negative conduct entry per student (spec §10), with optional
// supporting attachment (PDF/JPG/PNG).
const behaviorEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: BEHAVIOR_TYPES, required: true }, // + / -
    title: { type: String, required: true },
    description: { type: String, required: true },
    attachmentUrl: { type: String },

    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // authoring staff
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BehaviorEntry", behaviorEntrySchema);
