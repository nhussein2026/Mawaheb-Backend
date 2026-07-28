const mongoose = require("mongoose");
const {
  COURSE_KINDS,
  COURSE_TYPES,
  COURSE_STATUSES,
} = require("../utils/instituteEnums");

// Unified Course, discriminated by `kind`:
//  - "personal": a course a student self-logs (existing scholarship/general
//    behaviour — owned by `user`, optional `course_image`).
//  - "training": an institute-managed training course (spec §8) — owned by a
//    responsible `trainer`, auto-enrolls students by batch (see Enrollment),
//    and issues certificates on completion.
const courseSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: COURSE_KINDS, default: "personal" },

    // ── common ────────────────────────────────────────────────
    title: { type: String, required: true }, // personal title / training course name (AR)
    description: { type: String },

    // ── personal (self-logged) ────────────────────────────────
    course_image: { type: String },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.kind !== "training";
      },
    },

    // ── training (institute-managed, spec §8) ─────────────────
    courseType: { type: String, enum: COURSE_TYPES }, // standalone | program
    programTitleAr: { type: String },
    programTitleEn: { type: String },
    certTitleEn: { type: String }, // EN title printed on issued certificates
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    hours: { type: Number },
    periodText: { type: String }, // free-text range e.g. "24-25/6/2026"
    documentationDate: { type: Date },
    status: { type: String, enum: COURSE_STATUSES, default: "ongoing" },
    batches: [{ type: String }], // batches whose students are auto-enrolled

    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
