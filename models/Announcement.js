const mongoose = require("mongoose");
const { ANNOUNCEMENT_SCOPES } = require("../utils/instituteEnums");

// Administrative announcement/directive (spec §4). Targeted at an audience
// (all / a level / one-or-more batches / supervisors) within a publish window.
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },

    targetScope: { type: String, enum: ANNOUNCEMENT_SCOPES, default: "all" },
    // When scope = "level" these are ACADEMIC_LEVELS keys; when "batch" these
    // are batch values (e.g. "11"). Empty for "all" / "supervisors".
    targetRefs: [{ type: String }],

    publishStart: { type: Date, required: true },
    publishEnd: { type: Date, required: true },

    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
