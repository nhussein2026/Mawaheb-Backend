const Result = require("../../models/Result");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const {
  RESULT_TERMS,
  RESULT_EXAM_TYPES,
} = require("../../utils/instituteEnums");

// Exam type → classification (شهري / فصلي / نهائي).
const classify = (examType) => {
  if (examType === "monthly_1" || examType === "monthly_2") return "monthly";
  if (examType === "term_end") return "term";
  if (examType === "year_end") return "final";
  return undefined;
};

async function studentIdsForBatch(batch) {
  if (!batch) return null;
  const profiles = await InstituteStudent.find({ batch }).select("user").lean();
  return profiles.map((p) => p.user);
}

// GET /institute/results?student=&batch=&classification=&term=&examType=&academicYear=
exports.listResults = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const { student, batch, classification, term, examType } = req.query;

    if (student) filter.student = student;
    else {
      const ids = await studentIdsForBatch(batch);
      if (ids) filter.student = { $in: ids };
    }
    if (classification) filter.classification = classification;
    if (term) filter.term = term;
    if (examType) filter.examType = examType;

    const data = await Result.find(filter)
      .populate("student", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    console.error("listResults error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/results   (multipart: `image`)
exports.createResult = async (req, res) => {
  try {
    const { student, term, examType, academicYear } = req.body;
    if (!student || !term || !examType) {
      return res.status(400).json({
        success: false,
        message: "الطالب والفصل الدراسي ونوع الاختبار مطلوبة",
      });
    }
    if (!RESULT_TERMS.includes(term) || !RESULT_EXAM_TYPES.includes(examType)) {
      return res
        .status(400)
        .json({ success: false, message: "قيم الفصل أو نوع الاختبار غير صالحة" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "صورة كشف الدرجات مطلوبة" });
    }

    let yearId = academicYear;
    if (!yearId) {
      const active = await AcademicYear.findOne({ isActive: true }).lean();
      yearId = active?._id;
    }

    const result = await Result.create({
      student,
      academicYear: yearId,
      term,
      examType,
      classification: classify(examType),
      imageUrl: req.file.path,
      approvedBy: req.user.id,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("createResult error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/results/:id/guardian-viewed   (called from the guardian face)
exports.markGuardianViewed = async (req, res) => {
  try {
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { guardianViewedAt: new Date() },
      { new: true }
    );
    if (!result)
      return res.status(404).json({ success: false, message: "النتيجة غير موجودة" });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("markGuardianViewed error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /institute/results/:id
exports.deleteResult = async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result)
      return res.status(404).json({ success: false, message: "النتيجة غير موجودة" });
    res.json({ success: true, message: "تم حذف النتيجة" });
  } catch (error) {
    console.error("deleteResult error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
