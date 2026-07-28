const mongoose = require("mongoose");

// Annual fee record for a paid-seat student (spec §14). Split into two 50%
// installments (see Installment). One Fee per student per academic year.
const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
    totalAnnual: { type: Number, default: 0 }, // إجمالي الرسوم السنوية
  },
  { timestamps: true }
);

feeSchema.index({ student: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("Fee", feeSchema);
