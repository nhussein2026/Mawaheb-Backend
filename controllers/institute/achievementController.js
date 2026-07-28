const UserAchievement = require("../../models/UserAchievement");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const {
  ACHIEVEMENT_REVIEW_STATUSES,
} = require("../../utils/instituteEnums");

// Institute achievements are the judged ones — self-logged scholarship/general
// achievements carry reviewStatus "none" and never appear in the judging queue.
const INSTITUTE_STATUSES = ["pending", "approved", "rejected"];

// GET /institute/achievements/stats?academicYear=
exports.getAchievementStats = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const scoped = { ...filter, reviewStatus: { $in: INSTITUTE_STATUSES } };

    const achievements = await UserAchievement.find(scoped)
      .select("user reviewStatus")
      .lean();

    const recorded = achievements.length;
    const awaiting = achievements.filter((a) => a.reviewStatus === "pending").length;
    const approved = achievements.filter((a) => a.reviewStatus === "approved").length;

    const submitters = new Set(achievements.map((a) => String(a.user)));
    const submittedCount = submitters.size;
    const totalStudents = await InstituteStudent.countDocuments();

    res.json({
      success: true,
      data: {
        recorded,
        awaiting,
        approved,
        submittedCount,
        noneCount: Math.max(0, totalStudents - submittedCount),
        avgPerStudent: totalStudents
          ? +(recorded / totalStudents).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    console.error("getAchievementStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/achievements?reviewStatus=&academicYear=
exports.listAchievements = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    filter.reviewStatus = req.query.reviewStatus
      ? req.query.reviewStatus
      : { $in: INSTITUTE_STATUSES };

    const data = await UserAchievement.find(filter)
      .populate("user", "name")
      .populate("reviewer", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error("listAchievements error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/achievements   (student submits; multipart: optional `file`)
exports.createAchievement = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title)
      return res
        .status(400)
        .json({ success: false, message: "عنوان الإنجاز مطلوب" });

    const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
    const achievement = await UserAchievement.create({
      title,
      description,
      category,
      user: req.user.id,
      fileUrl: req.file ? req.file.path : undefined,
      reviewStatus: "pending",
      academicYear: activeYear?._id,
    });

    res.status(201).json({ success: true, data: achievement });
  } catch (error) {
    console.error("createAchievement error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/achievements/:id/judge   ({ reviewStatus, feedback })
exports.judgeAchievement = async (req, res) => {
  try {
    const { reviewStatus, feedback } = req.body;
    if (!ACHIEVEMENT_REVIEW_STATUSES.includes(reviewStatus) || reviewStatus === "none") {
      return res
        .status(400)
        .json({ success: false, message: "حالة التحكيم غير صالحة" });
    }

    const achievement = await UserAchievement.findById(req.params.id);
    if (!achievement)
      return res
        .status(404)
        .json({ success: false, message: "الإنجاز غير موجود" });

    achievement.reviewStatus = reviewStatus;
    if (feedback !== undefined) achievement.feedback = feedback;
    achievement.reviewer = req.user.id;
    achievement.reviewedAt = new Date();
    await achievement.save();

    res.json({ success: true, data: achievement });
  } catch (error) {
    console.error("judgeAchievement error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
