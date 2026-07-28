const BehaviorEntry = require("../../models/BehaviorEntry");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { BEHAVIOR_TYPES } = require("../../utils/instituteEnums");

// GET /institute/behavior/stats?academicYear=
exports.getBehaviorStats = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const [total, positive, negative] = await Promise.all([
      BehaviorEntry.countDocuments(filter),
      BehaviorEntry.countDocuments({ ...filter, type: "positive" }),
      BehaviorEntry.countDocuments({ ...filter, type: "negative" }),
    ]);
    res.json({ success: true, data: { total, positive, negative } });
  } catch (error) {
    console.error("getBehaviorStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Resolve the set of student user-ids for an optional ?batch= filter.
async function studentIdsForBatch(batch) {
  if (!batch) return null;
  const profiles = await InstituteStudent.find({ batch })
    .select("user")
    .lean();
  return profiles.map((p) => p.user);
}

// GET /institute/behavior?student=&batch=&academicYear=
exports.listBehavior = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const { student, batch } = req.query;

    if (student) filter.student = student;
    else {
      const ids = await studentIdsForBatch(batch);
      if (ids) filter.student = { $in: ids };
    }

    const data = await BehaviorEntry.find(filter)
      .populate("student", "name")
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error("listBehavior error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/behavior   (multipart: optional `attachment`)
exports.createBehavior = async (req, res) => {
  try {
    const { student, type, title, description } = req.body;

    if (!student || !type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "الطالب والنوع والعنوان والوصف مطلوبة",
      });
    }
    if (!BEHAVIOR_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "نوع السجل غير صالح" });
    }

    const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
    const entry = await BehaviorEntry.create({
      student,
      type,
      title,
      description,
      attachmentUrl: req.file ? req.file.path : undefined,
      author: req.user.id,
      academicYear: activeYear?._id,
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error("createBehavior error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /institute/behavior/:id
exports.deleteBehavior = async (req, res) => {
  try {
    const entry = await BehaviorEntry.findByIdAndDelete(req.params.id);
    if (!entry)
      return res.status(404).json({ success: false, message: "السجل غير موجود" });
    res.json({ success: true, message: "تم حذف السجل" });
  } catch (error) {
    console.error("deleteBehavior error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
