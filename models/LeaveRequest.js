const mongoose = require("mongoose");
const { LEAVE_STATUSES } = require("../utils/instituteEnums");

// Student leave/departure request (spec §11). Supervisors approve/reject; the
// gate lifecycle (checked out / returned) is tracked beyond the raw decision.
const leaveRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    departureAt: { type: Date, required: true }, // 🛫 date + time
    returnAt: { type: Date, required: true }, // 🛬 date + time
    reason: { type: String, required: true }, // السبب والوجهة

    status: { type: String, enum: LEAVE_STATUSES, default: "pending" },
    supervisorNotes: { type: String }, // visible to student
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },

    // Gate lifecycle (derived states: approved-not-left, left-not-returned).
    checkedOutAt: { type: Date },
    returnedAt: { type: Date },

    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
