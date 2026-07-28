const Evaluation = require("../../models/Evaluation");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { EVALUATION_PERIODS } = require("../../utils/instituteEnums");

async function studentIdsForBatch(batch) {
  if (!batch) return null;
  const profiles = await InstituteStudent.find({ batch }).select("user").lean();
  return profiles.map((p) => p.user);
}

// GET /institute/evaluations?student=&batch=&periodType=&academicYear=
exports.listEvaluations = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const { student, batch, periodType } = req.query;

    if (student) filter.student = student;
    else {
      const ids = await studentIdsForBatch(batch);
      if (ids) filter.student = { $in: ids };
    }
    if (periodType) filter.periodType = periodType;

    const data = await Evaluation.find(filter)
      .populate("student", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error("listEvaluations error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/evaluations   (multipart: `file`)
exports.createEvaluation = async (req, res) => {
  try {
    const { student, periodType, notes, academicYear } = req.body;
    if (!student || !periodType) {
      return res.status(400).json({
        success: false,
        message: "الطالب ونوع التقرير مطلوبان",
      });
    }
    if (!EVALUATION_PERIODS.includes(periodType)) {
      return res
        .status(400)
        .json({ success: false, message: "نوع التقرير غير صالح" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "ملف التقرير مطلوب" });
    }

    let yearId = academicYear;
    if (!yearId) {
      const active = await AcademicYear.findOne({ isActive: true }).lean();
      yearId = active?._id;
    }

    const evaluation = await Evaluation.create({
      student,
      academicYear: yearId,
      periodType,
      fileUrl: req.file.path,
      notes,
      approvedBy: req.user.id,
    });

    res.status(201).json({ success: true, data: evaluation });
  } catch (error) {
    console.error("createEvaluation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/evaluations/:id/guardian-viewed
exports.markGuardianViewed = async (req, res) => {
  try {
    const evaluation = await Evaluation.findByIdAndUpdate(
      req.params.id,
      { guardianViewedAt: new Date() },
      { new: true }
    );
    if (!evaluation)
      return res.status(404).json({ success: false, message: "التقرير غير موجود" });
    res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error("markGuardianViewed error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /institute/evaluations/:id
exports.deleteEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findByIdAndDelete(req.params.id);
    if (!evaluation)
      return res.status(404).json({ success: false, message: "التقرير غير موجود" });
    res.json({ success: true, message: "تم حذف التقرير" });
  } catch (error) {
    console.error("deleteEvaluation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
