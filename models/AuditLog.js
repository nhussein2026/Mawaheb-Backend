const mongoose = require("mongoose");

// Audit trail for sensitive mutations (spec §14 flags fee "mark paid / cancel
// payment" as needing an audit log + role guard). Kept generic so any module
// can record who changed what.
const auditLogSchema = new mongoose.Schema(
  {
    entity: { type: String, required: true }, // e.g. "Installment"
    entityId: { type: mongoose.Schema.Types.ObjectId }, // affected document
    action: { type: String, required: true }, // e.g. "installment.mark_paid"
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who did it
    meta: { type: mongoose.Schema.Types.Mixed }, // before/after or extra context
  },
  { timestamps: true }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
