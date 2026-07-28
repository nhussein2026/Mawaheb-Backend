const mongoose = require("mongoose");
const { INSTALLMENT_SEQUENCES } = require("../utils/instituteEnums");

// One of the two 50% installments of a Fee (spec §14). Paid/unpaid toggles are
// sensitive financial mutations — every change is recorded in AuditLog.
const installmentSchema = new mongoose.Schema(
  {
    fee: { type: mongoose.Schema.Types.ObjectId, ref: "Fee", required: true },
    seq: { type: Number, enum: INSTALLMENT_SEQUENCES, required: true }, // 1 | 2
    amount: { type: Number, default: 0 }, // 50% of totalAnnual
    dueDate: { type: Date },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

installmentSchema.index({ fee: 1, seq: 1 }, { unique: true });

module.exports = mongoose.model("Installment", installmentSchema);
