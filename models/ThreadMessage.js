const mongoose = require("mongoose");

// A reply within a Thread (spec §5/§9 "previous replies log"). Attachments are
// JPG/PNG/PDF ≤ 5 MB, enforced by the uploadDoc middleware.
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    mime: { type: String },
    sizeBytes: { type: Number },
  },
  { _id: false }
);

const threadMessageSchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ThreadMessage", threadMessageSchema);
