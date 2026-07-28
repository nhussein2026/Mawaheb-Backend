const Thread = require("../../models/Thread");
const ThreadMessage = require("../../models/ThreadMessage");
const {
  THREAD_STATUSES_BY_CATEGORY,
} = require("../../utils/instituteEnums");

// Map multer files → attachment sub-docs (JPG/PNG/PDF ≤5MB via uploadDoc).
const toAttachments = (files = []) =>
  files.map((f) => ({ url: f.path, mime: f.mimetype, sizeBytes: f.size }));

const defaultStatus = (category) =>
  category === "bug_report" ? "pending" : "open";

// GET stats — shape differs per category.
const getStats = (category) => async (req, res) => {
  try {
    const me = req.user.id;
    if (category === "bug_report") {
      const [total, pending, inProgress, resolved] = await Promise.all([
        Thread.countDocuments({ category }),
        Thread.countDocuments({ category, status: "pending" }),
        Thread.countDocuments({ category, status: "in_progress" }),
        Thread.countDocuments({ category, status: "resolved" }),
      ]);
      return res.json({ success: true, data: { total, pending, inProgress, resolved } });
    }
    // correspondence
    const [inbox, awaiting, sent] = await Promise.all([
      Thread.countDocuments({ category }),
      Thread.countDocuments({
        category,
        status: "open",
        lastMessageBy: { $ne: me },
      }),
      Thread.countDocuments({ category, author: me }),
    ]);
    res.json({ success: true, data: { inbox, awaiting, sent } });
  } catch (error) {
    console.error("thread getStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET list (inbox), most-recent activity first.
const listThreads = (category) => async (req, res) => {
  try {
    const filter = { category };
    if (req.query.status) filter.status = req.query.status;

    const data = await Thread.find(filter)
      .populate("author", "name")
      .populate("recipients", "name")
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error("thread listThreads error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET single thread + its replies.
const getThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate("author", "name")
      .populate("recipients", "name")
      .lean();
    if (!thread)
      return res.status(404).json({ success: false, message: "غير موجود" });

    const messages = await ThreadMessage.find({ thread: thread._id })
      .populate("author", "name")
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: { thread, messages } });
  } catch (error) {
    console.error("thread getThread error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST create (multipart: `attachments`). recipients = comma-separated ids.
const createThread = (category) => async (req, res) => {
  try {
    const { subject, body, moduleTag, recipients } = req.body;
    if (!subject || !body) {
      return res
        .status(400)
        .json({ success: false, message: "الموضوع والنص مطلوبان" });
    }

    const recipientIds = recipients
      ? String(recipients).split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const thread = await Thread.create({
      category,
      subject,
      body,
      attachments: toAttachments(req.files),
      author: req.user.id,
      recipients: recipientIds,
      moduleTag,
      status: defaultStatus(category),
      lastMessageAt: new Date(),
      lastMessageBy: req.user.id,
    });

    res.status(201).json({ success: true, data: thread });
  } catch (error) {
    console.error("thread createThread error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST reply (multipart: `attachments`).
const replyThread = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body)
      return res.status(400).json({ success: false, message: "نص الرد مطلوب" });

    const thread = await Thread.findById(req.params.id);
    if (!thread)
      return res.status(404).json({ success: false, message: "غير موجود" });

    const message = await ThreadMessage.create({
      thread: thread._id,
      author: req.user.id,
      body,
      attachments: toAttachments(req.files),
    });

    thread.lastMessageAt = new Date();
    thread.lastMessageBy = req.user.id;
    // A reply on a resolved/closed bug re-opens follow-up; leave status as-is
    // for correspondence unless closed.
    await thread.save();

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error("thread replyThread error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT status — validated against the category's allowed set.
const setStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const thread = await Thread.findById(req.params.id);
    if (!thread)
      return res.status(404).json({ success: false, message: "غير موجود" });

    const allowed = THREAD_STATUSES_BY_CATEGORY[thread.category] || [];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "حالة غير صالحة لهذا النوع" });
    }
    thread.status = status;
    await thread.save();
    res.json({ success: true, data: thread });
  } catch (error) {
    console.error("thread setStatus error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getStats,
  listThreads,
  getThread,
  createThread,
  replyThread,
  setStatus,
};
