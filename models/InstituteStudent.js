const mongoose = require("mongoose");
const { ACADEMIC_LEVELS, SEAT_TYPES } = require("../utils/instituteEnums");

// Institute student academic & financial profile (spec §3 student block +
// Appendix C StudentProfile). One-to-one with a User whose instituteRole = "student".
const instituteStudentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Year the student is enrolled under; scopes dashboard/stat queries.
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },

    academicNumber: { type: String }, // الرقم الأكاديمي (e.g. "1101")
    batch: { type: String }, // الدفعة / cohort (e.g. "11")
    level: { type: String, enum: ACADEMIC_LEVELS }, // تصنيف المستوى
    seatType: { type: String, enum: SEAT_TYPES, default: "free" }, // نوع المقعد

    ideasBankBalance: { type: Number, default: 0 }, // رصيد بنك الأفكار (points)

    governorate: { type: String }, // المحافظة
    district: { type: String }, // المديرية

    // Guardian info (ولي الأمر). PIN is hashed like a password — never returned.
    guardianName: { type: String },
    guardianMobile: { type: String },
    guardianPinHash: { type: String, select: false },

    // Legacy fields from the original minimal model — kept optional for
    // back-compat with any existing records.
    education_level: { type: String },
    talent: { type: String },
    parent_phone: { type: String },
  },
  { timestamps: true }
);

const InstituteStudent = mongoose.model(
  "InstituteStudent",
  instituteStudentSchema
);

module.exports = InstituteStudent;
