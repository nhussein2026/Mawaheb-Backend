const mongoose = require("mongoose");

// Join model between a training Course and a student (spec §8). Training
// courses auto-enroll every student in the selected batch(es); a certificate
// is issued per enrollment on completion (see courseController.issueCertificates).
const enrollmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },

    enrolledVia: { type: String, enum: ["batch", "manual"], default: "batch" },
    batch: { type: String }, // the batch that pulled the student in (enrolledVia = "batch")

    completed: { type: Boolean, default: false },
    completedAt: { type: Date },

    certificate: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate" },
  },
  { timestamps: true }
);

// One enrollment per (course, student).
enrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
