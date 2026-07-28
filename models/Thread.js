const mongoose = require("mongoose");
const {
  THREAD_CATEGORIES,
  THREAD_STATUSES_BY_CATEGORY,
} = require("../utils/instituteEnums");

// Unified messaging/ticket core (spec §5 Bug Reports + §9 Correspondence, and
// eventually the existing support Ticket). One structure, discriminated by
// `category`. The opener's content lives on the thread (body + attachments);
// subsequent replies live in ThreadMessage.
const allStatuses = [
  ...new Set(Object.values(THREAD_STATUSES_BY_CATEGORY).flat()),
];

const attachmentSchema = new mongoose.Schema(
  { url: { type: String, required: true }, mime: String, sizeBytes: Number },
  { _id: false }
);

const threadSchema = new mongoose.Schema(
  {
    category: { type: String, enum: THREAD_CATEGORIES, required: true },

    subject: { type: String, required: true },
    body: { type: String, required: true }, // opener message
    attachments: [attachmentSchema], // opener attachments

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Correspondence can target multiple recipients (spec §9).
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Support tickets: the staff member handling the ticket (legacy Ticket.assignedTo).
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    moduleTag: { type: String }, // bug reports: originating module, e.g. "behavior"

    // Traceability for the Ticket → Thread backfill (idempotency marker).
    sourceTicket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },

    status: { type: String, enum: allStatuses, default: "open" },
    lastMessageAt: { type: Date, default: Date.now }, // for inbox sorting
    lastMessageBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // drives "awaiting reply"

    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  },
  { timestamps: true }
);

// One Thread per migrated Ticket (sparse: only migrated threads carry the field).
threadSchema.index({ sourceTicket: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Thread", threadSchema);
