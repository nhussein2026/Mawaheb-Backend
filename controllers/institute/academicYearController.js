const AcademicYear = require("../../models/AcademicYear");
const InstituteStudent = require("../../models/InstituteStudent");
const { ACADEMIC_LEVELS } = require("../../utils/instituteEnums");

// GET /institute/academic-years
exports.listYears = async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ startDate: -1 }).lean();
    res.json({ success: true, data: years });
  } catch (error) {
    console.error("listYears error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/academic-years
exports.createYear = async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;
    if (!name || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, message: "الاسم وتاريخا البداية والنهاية مطلوبة" });
    }

    // Only one active year at a time.
    if (isActive) {
      await AcademicYear.updateMany({}, { $set: { isActive: false } });
    }

    const year = await AcademicYear.create({
      name,
      startDate,
      endDate,
      isActive: !!isActive,
    });
    res.status(201).json({ success: true, data: year });
  } catch (error) {
    console.error("createYear error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/academic-years/:id
exports.updateYear = async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;
    const year = await AcademicYear.findById(req.params.id);
    if (!year)
      return res.status(404).json({ success: false, message: "العام غير موجود" });

    if (isActive) {
      await AcademicYear.updateMany(
        { _id: { $ne: year._id } },
        { $set: { isActive: false } }
      );
    }

    if (name !== undefined) year.name = name;
    if (startDate !== undefined) year.startDate = startDate;
    if (endDate !== undefined) year.endDate = endDate;
    if (isActive !== undefined) year.isActive = !!isActive;

    await year.save();
    res.json({ success: true, data: year });
  } catch (error) {
    console.error("updateYear error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /institute/academic-years/:id
exports.deleteYear = async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year)
      return res.status(404).json({ success: false, message: "العام غير موجود" });
    res.json({ success: true, message: "تم حذف العام الدراسي" });
  } catch (error) {
    console.error("deleteYear error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/academic-years/:id/training
// Save the post-secondary training program window (spec §2, section 2).
exports.saveTrainingWindow = async (req, res) => {
  try {
    const { trainingStartDate, trainingEndDate } = req.body;
    const year = await AcademicYear.findById(req.params.id);
    if (!year)
      return res.status(404).json({ success: false, message: "العام غير موجود" });

    year.trainingStartDate = trainingStartDate || null;
    year.trainingEndDate = trainingEndDate || null;
    await year.save();
    res.json({ success: true, data: year });
  } catch (error) {
    console.error("saveTrainingWindow error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/students/promotable?level=<levelKey>
// Students eligible for promotion (optionally filtered by their current level).
exports.getPromotableStudents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.level && ACADEMIC_LEVELS.includes(req.query.level)) {
      filter.level = req.query.level;
    }

    const students = await InstituteStudent.find(filter)
      .populate("user", "name")
      .select("academicNumber batch level user")
      .sort({ academicNumber: 1 })
      .lean();

    res.json({ success: true, data: students });
  } catch (error) {
    console.error("getPromotableStudents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/students/promote  { studentIds: [], targetLevel }
exports.promoteStudents = async (req, res) => {
  try {
    const { studentIds, targetLevel } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "لم يتم تحديد أي طالب" });
    }
    if (!ACADEMIC_LEVELS.includes(targetLevel)) {
      return res
        .status(400)
        .json({ success: false, message: "المرحلة المستهدفة غير صالحة" });
    }

    const result = await InstituteStudent.updateMany(
      { _id: { $in: studentIds } },
      { $set: { level: targetLevel } }
    );

    res.json({
      success: true,
      message: "تمت ترقية الطلاب المحددين",
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("promoteStudents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
