const mongoose = require("mongoose");
const { CERTIFICATE_SOURCES } = require("../utils/instituteEnums");

// Unified Certificate, discriminated by `source`:
//  - "self_logged": a certificate a student self-logs (existing behaviour).
//  - "issued": granted by the institute when a training course is completed
//    (spec §8). `user` is set to the recipient student so the existing
//    "my certificates" screen shows issued certificates too.
const certificateSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: CERTIFICATE_SOURCES,
      default: "self_logged",
    },

    // ── common ────────────────────────────────────────────────
    title: { type: String, required: true },
    description: { type: String },
    certificate_image: { type: String },
    certificate_link: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── issued (institute grants on course completion) ────────
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // recipient (== user for issued)
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    certTitleEn: { type: String },
    serial: { type: String },
    issuedAt: { type: Date },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

const Certificate = mongoose.model("Certificate", certificateSchema);

module.exports = Certificate;
