// Institute student self-service reads (spec §6 "student face"). Every handler
// is scoped to the logged-in student (req.user.id) and runs behind
// `isInstituteStudent`. Write/submit endpoints (leave, ideas, achievements)
// live in their own module controllers.
const InstituteStudent = require("../../models/InstituteStudent");
const Announcement = require("../../models/Announcement");
const Result = require("../../models/Result");
const Evaluation = require("../../models/Evaluation");
const BehaviorEntry = require("../../models/BehaviorEntry");
const LeaveRequest = require("../../models/LeaveRequest");
const Idea = require("../../models/Idea");
const UserAchievement = require("../../models/UserAchievement");
const Enrollment = require("../../models/Enrollment");
const Certificate = require("../../models/Certificate");
const Fee = require("../../models/Fee");
const Installment = require("../../models/Installment");
const Thread = require("../../models/Thread");
const ThreadMessage = require("../../models/ThreadMessage");
const User = require("../../models/User");
const { INSTITUTE_ADMIN_ROLES } = require("../../utils/instituteEnums");

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, error, where) => {
  console.error(`${where} error:`, error);
  res.status(500).json({ success: false, message: "Server error" });
};

// Announcements visible to a given student profile, within the publish window.
function announcementQuery(profile) {
  const now = new Date();
  const or = [{ targetScope: "all" }];
  if (profile?.level) or.push({ targetScope: "level", targetRefs: profile.level });
  if (profile?.batch) or.push({ targetScope: "batch", targetRefs: profile.batch });
  return {
    $or: or,
    publishStart: { $lte: now },
    publishEnd: { $gte: now },
  };
}

// GET /institute/me/overview  → profile + headline counts for the landing page
exports.getOverview = async (req, res) => {
  try {
    const uid = req.user.id;
    const profile = await InstituteStudent.findOne({ user: uid })
      .populate("user", "name email full_name_en")
      .lean();

    const [courses, certificates, approvedAchievements, pendingLeave, announcements] =
      await Promise.all([
        Enrollment.countDocuments({ student: uid }),
        Certificate.countDocuments({ student: uid, source: "issued" }),
        UserAchievement.countDocuments({ user: uid, reviewStatus: "approved" }),
        LeaveRequest.countDocuments({ student: uid, status: "pending" }),
        Announcement.find(announcementQuery(profile))
          .sort({ publishStart: -1 })
          .limit(3)
          .lean(),
      ]);

    ok(res, {
      profile: profile || null,
      counts: {
        courses,
        certificates,
        approvedAchievements,
        pendingLeave,
        ideasBankBalance: profile?.ideasBankBalance || 0,
      },
      announcements,
    });
  } catch (error) {
    fail(res, error, "getOverview");
  }
};

// GET /institute/me/announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const profile = await InstituteStudent.findOne({ user: req.user.id }).lean();
    const data = await Announcement.find(announcementQuery(profile))
      .sort({ publishStart: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getAnnouncements");
  }
};

// GET /institute/me/results
exports.getResults = async (req, res) => {
  try {
    const data = await Result.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getResults");
  }
};

// GET /institute/me/evaluations
exports.getEvaluations = async (req, res) => {
  try {
    const data = await Evaluation.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getEvaluations");
  }
};

// GET /institute/me/behavior
exports.getBehavior = async (req, res) => {
  try {
    const data = await BehaviorEntry.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getBehavior");
  }
};

// GET /institute/me/leave
exports.getLeave = async (req, res) => {
  try {
    const data = await LeaveRequest.find({ student: req.user.id })
      .populate("decidedBy", "name")
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getLeave");
  }
};

// GET /institute/me/ideas
exports.getIdeas = async (req, res) => {
  try {
    const data = await Idea.find({ student: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getIdeas");
  }
};

// GET /institute/me/achievements
exports.getAchievements = async (req, res) => {
  try {
    const data = await UserAchievement.find({
      user: req.user.id,
      reviewStatus: { $ne: "none" },
    })
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getAchievements");
  }
};

// GET /institute/me/courses  → enrollments with their course + certificate
exports.getCourses = async (req, res) => {
  try {
    const data = await Enrollment.find({ student: req.user.id })
      .populate("course", "title certTitleEn trainer status periodText hours")
      .populate("certificate", "serial certTitleEn issuedAt")
      .sort({ createdAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getCourses");
  }
};

// GET /institute/me/certificates
exports.getCertificates = async (req, res) => {
  try {
    const data = await Certificate.find({ student: req.user.id, source: "issued" })
      .populate("course", "title")
      .sort({ issuedAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "getCertificates");
  }
};

// GET /institute/me/fees  → the student's fee record + its two installments
exports.getFees = async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.user.id }).lean();
    const feeIds = fees.map((f) => f._id);
    const installments = await Installment.find({ fee: { $in: feeIds } })
      .sort({ seq: 1 })
      .lean();
    ok(res, { fees, installments });
  } catch (error) {
    fail(res, error, "getFees");
  }
};

// ── Correspondence & bug threads (student face, spec §5/§9) ────
const toAttachments = (files = []) =>
  files.map((f) => ({ url: f.path, mime: f.mimetype, sizeBytes: f.size }));

// A student may only touch a thread they opened or are a recipient of.
const ownsThread = (thread, uid) =>
  String(thread.author) === String(uid) ||
  (thread.recipients || []).some((r) => String(r) === String(uid));

// GET /institute/me/(correspondence|bugs)  → the student's own threads
exports.listMyThreads = (category) => async (req, res) => {
  try {
    const data = await Thread.find({ category, author: req.user.id })
      .populate("author", "name")
      .sort({ lastMessageAt: -1 })
      .lean();
    ok(res, data);
  } catch (error) {
    fail(res, error, "listMyThreads");
  }
};

// POST /institute/me/(correspondence|bugs)  (multipart: `attachments`)
// Correspondence auto-targets the institute admins; bugs carry a module tag.
exports.createMyThread = (category) => async (req, res) => {
  try {
    const { subject, body, moduleTag } = req.body;
    if (!subject || !body) {
      return res
        .status(400)
        .json({ success: false, message: "الموضوع والنص مطلوبان" });
    }

    let recipients = [];
    if (category === "correspondence") {
      const admins = await User.find({
        instituteRole: { $in: INSTITUTE_ADMIN_ROLES },
      })
        .select("_id")
        .lean();
      recipients = admins.map((a) => a._id);
    }

    const thread = await Thread.create({
      category,
      subject,
      body,
      attachments: toAttachments(req.files),
      author: req.user.id,
      recipients,
      moduleTag: category === "bug_report" ? moduleTag : undefined,
      status: category === "bug_report" ? "pending" : "open",
      lastMessageAt: new Date(),
      lastMessageBy: req.user.id,
    });

    res.status(201).json({ success: true, data: thread });
  } catch (error) {
    fail(res, error, "createMyThread");
  }
};

// GET /institute/me/threads/:id  → thread + replies (ownership-checked)
exports.getMyThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate("author", "name")
      .lean();
    if (!thread)
      return res.status(404).json({ success: false, message: "غير موجود" });
    if (!ownsThread(thread, req.user.id))
      return res.status(403).json({ success: false, message: "غير مصرح" });

    const messages = await ThreadMessage.find({ thread: thread._id })
      .populate("author", "name")
      .sort({ createdAt: 1 })
      .lean();
    ok(res, { thread, messages });
  } catch (error) {
    fail(res, error, "getMyThread");
  }
};

// POST /institute/me/threads/:id/reply  (multipart: `attachments`)
exports.replyMyThread = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body)
      return res.status(400).json({ success: false, message: "نص الرد مطلوب" });

    const thread = await Thread.findById(req.params.id);
    if (!thread)
      return res.status(404).json({ success: false, message: "غير موجود" });
    if (!ownsThread(thread, req.user.id))
      return res.status(403).json({ success: false, message: "غير مصرح" });

    const message = await ThreadMessage.create({
      thread: thread._id,
      author: req.user.id,
      body,
      attachments: toAttachments(req.files),
    });
    thread.lastMessageAt = new Date();
    thread.lastMessageBy = req.user.id;
    await thread.save();

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    fail(res, error, "replyMyThread");
  }
};
