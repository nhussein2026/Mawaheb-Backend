const Idea = require("../../models/Idea");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { IDEA_STATUSES } = require("../../utils/instituteEnums");

// GET /institute/ideas/stats?academicYear=
exports.getIdeaStats = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);

    const ideas = await Idea.find(filter)
      .select("student status rewardPoints")
      .lean();

    const recorded = ideas.length;
    const awaiting = ideas.filter((i) => i.status === "under_study").length;
    const approved = ideas.filter((i) => i.status === "approved").length;

    const submitters = new Set(ideas.map((i) => String(i.student)));
    const totalStudents = await InstituteStudent.countDocuments();
    const submittedCount = submitters.size;

    // Most ideas submitted (leaderboard).
    const countByStudent = {};
    ideas.forEach((i) => {
      const k = String(i.student);
      countByStudent[k] = (countByStudent[k] || 0) + 1;
    });
    let mostIdeasStudent = null;
    Object.entries(countByStudent).forEach(([k, c]) => {
      if (!mostIdeasStudent || c > mostIdeasStudent.count)
        mostIdeasStudent = { student: k, count: c };
    });

    // Top ideas-bank score (from student profiles).
    const topProfile = await InstituteStudent.findOne()
      .sort({ ideasBankBalance: -1 })
      .populate("user", "name")
      .select("ideasBankBalance user")
      .lean();

    res.json({
      success: true,
      data: {
        recorded,
        awaiting,
        approved,
        submittedCount,
        noneCount: Math.max(0, totalStudents - submittedCount),
        avgPerStudent: totalStudents ? +(recorded / totalStudents).toFixed(2) : 0,
        topScorer: topProfile
          ? { name: topProfile.user?.name, points: topProfile.ideasBankBalance }
          : null,
        mostIdeas: mostIdeasStudent,
      },
    });
  } catch (error) {
    console.error("getIdeaStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/ideas?status=&academicYear=
exports.listIdeas = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    if (req.query.status) filter.status = req.query.status;

    const data = await Idea.find(filter)
      .populate("student", "name")
      .populate("reviewer", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error("listIdeas error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/ideas   (student submits)
exports.createIdea = async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject)
      return res
        .status(400)
        .json({ success: false, message: "موضوع الفكرة مطلوب" });

    const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
    const idea = await Idea.create({
      student: req.user.id,
      subject,
      description,
      academicYear: activeYear?._id,
    });
    res.status(201).json({ success: true, data: idea });
  } catch (error) {
    console.error("createIdea error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/ideas/:id/judge
// Approving injects reward points into the student's ideasBankBalance exactly
// once; re-judging reconciles the delta so the balance never drifts.
exports.judgeIdea = async (req, res) => {
  try {
    const { status, rewardPoints, notes } = req.body;
    if (!IDEA_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "حالة التقييم غير صالحة" });
    }

    const idea = await Idea.findById(req.params.id);
    if (!idea)
      return res.status(404).json({ success: false, message: "الفكرة غير موجودة" });

    const profile = await InstituteStudent.findOne({ user: idea.student });
    const newPoints = Number(rewardPoints) || 0;

    if (status === "approved") {
      const oldAwarded = idea.pointsAwarded ? idea.rewardPoints : 0;
      const delta = newPoints - oldAwarded;
      if (profile && delta !== 0) {
        profile.ideasBankBalance = (profile.ideasBankBalance || 0) + delta;
        await profile.save();
      }
      idea.rewardPoints = newPoints;
      idea.pointsAwarded = true;
    } else {
      // Moving away from approved: reverse any previously injected points.
      if (idea.pointsAwarded && profile) {
        profile.ideasBankBalance =
          (profile.ideasBankBalance || 0) - idea.rewardPoints;
        await profile.save();
      }
      idea.pointsAwarded = false;
    }

    idea.status = status;
    if (notes !== undefined) idea.notes = notes;
    idea.reviewer = req.user.id;
    idea.reviewedAt = new Date();
    await idea.save();

    res.json({ success: true, data: idea });
  } catch (error) {
    console.error("judgeIdea error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
