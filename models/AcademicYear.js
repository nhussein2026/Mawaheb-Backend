const mongoose = require("mongoose");

// Academic Year (العام الدراسي) — global data-scoping master record.
// Most institute domain records carry an `academicYear` ref back to this.
const academicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "2025/2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false }, // only one active at a time (enforced in controller)

    // Post-secondary training program window (spec §2, section 2)
    trainingStartDate: { type: Date },
    trainingEndDate: { type: Date },
  },
  { timestamps: true }
);

const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);

module.exports = AcademicYear;
