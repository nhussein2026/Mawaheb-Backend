const Course = require("../../models/Course");
const Enrollment = require("../../models/Enrollment");
const Certificate = require("../../models/Certificate");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { COURSE_TYPES, COURSE_STATUSES } = require("../../utils/instituteEnums");

// Only ever operate on the training side of the unified Course model here;
// personal (self-logged) courses stay owned by the scholarship controller.
const TRAINING = { kind: "training" };

// Auto-enroll every student in the given batches into the course (spec §8).
// Idempotent: existing enrollments are left untouched (unique index guards).
async function enrollBatches(course, batches, academicYear) {
  if (!Array.isArray(batches) || !batches.length) return;
  const students = await InstituteStudent.find({ batch: { $in: batches } })
    .select("user batch")
    .lean();

  const ops = students.map((s) => ({
    updateOne: {
      filter: { course: course._id, student: s.user },
      update: {
        $setOnInsert: {
          course: course._id,
          student: s.user,
          academicYear,
          enrolledVia: "batch",
          batch: s.batch,
        },
      },
      upsert: true,
    },
  }));
  if (ops.length) await Enrollment.bulkWrite(ops);
}

// GET /institute/courses/stats?academicYear=
exports.getCourseStats = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const courses = await Course.find({ ...filter, ...TRAINING })
      .select("_id")
      .lean();
    const courseIds = courses.map((c) => c._id);

    const [enrolled, certificates] = await Promise.all([
      Enrollment.countDocuments({ course: { $in: courseIds } }),
      Certificate.countDocuments({ ...filter, source: "issued" }),
    ]);

    res.json({
      success: true,
      data: { courses: courses.length, enrolled, certificates },
    });
  } catch (error) {
    console.error("getCourseStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/courses?academicYear=
exports.listCourses = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const courses = await Course.find({ ...filter, ...TRAINING })
      .populate("trainer", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Enrolled count per course in one pass.
    const counts = await Enrollment.aggregate([
      { $match: { course: { $in: courses.map((c) => c._id) } } },
      { $group: { _id: "$course", n: { $sum: 1 } } },
    ]);
    const byCourse = {};
    counts.forEach((c) => {
      byCourse[String(c._id)] = c.n;
    });
    courses.forEach((c) => {
      c.enrolledCount = byCourse[String(c._id)] || 0;
    });

    res.json({ success: true, data: courses });
  } catch (error) {
    console.error("listCourses error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/courses
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      courseType,
      programTitleAr,
      programTitleEn,
      certTitleEn,
      trainer,
      hours,
      periodText,
      documentationDate,
      status,
      batches,
      academicYear,
    } = req.body;

    if (!title || !courseType) {
      return res.status(400).json({
        success: false,
        message: "اسم الدورة ونوعها مطلوبان",
      });
    }
    if (!COURSE_TYPES.includes(courseType)) {
      return res
        .status(400)
        .json({ success: false, message: "نوع الدورة غير صالح" });
    }
    if (status && !COURSE_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "حالة الدورة غير صالحة" });
    }

    let yearId = academicYear;
    if (!yearId) {
      const active = await AcademicYear.findOne({ isActive: true }).lean();
      yearId = active?._id;
    }

    const batchList = Array.isArray(batches)
      ? batches
      : batches
      ? [batches]
      : [];

    const course = await Course.create({
      kind: "training",
      title,
      courseType,
      programTitleAr,
      programTitleEn,
      certTitleEn,
      trainer: trainer || undefined,
      hours,
      periodText,
      documentationDate: documentationDate || undefined,
      status: status || "ongoing",
      batches: batchList,
      academicYear: yearId,
    });

    await enrollBatches(course, batchList, yearId);

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error("createCourse error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// PUT /institute/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, ...TRAINING });
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "الدورة غير موجودة" });

    const editable = [
      "title",
      "courseType",
      "programTitleAr",
      "programTitleEn",
      "certTitleEn",
      "trainer",
      "hours",
      "periodText",
      "documentationDate",
      "status",
    ];
    // Empty strings for the ObjectId/Date fields must become null, else
    // Mongoose throws a CastError on save.
    const nullable = new Set(["trainer", "documentationDate"]);
    editable.forEach((f) => {
      if (req.body[f] !== undefined) {
        course[f] =
          nullable.has(f) && req.body[f] === "" ? null : req.body[f];
      }
    });

    if (req.body.batches !== undefined) {
      course.batches = Array.isArray(req.body.batches)
        ? req.body.batches
        : req.body.batches
        ? [req.body.batches]
        : [];
    }
    await course.save();

    // Pull in any newly-added batches (never un-enrolls existing students).
    await enrollBatches(course, course.batches, course.academicYear);

    res.json({ success: true, data: course });
  } catch (error) {
    console.error("updateCourse error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /institute/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      ...TRAINING,
    });
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "الدورة غير موجودة" });
    await Enrollment.deleteMany({ course: course._id });
    res.json({ success: true, message: "تم حذف الدورة" });
  } catch (error) {
    console.error("deleteCourse error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/courses/:id/issue-certificates
// Issues a certificate to every enrolled student who doesn't already have one,
// marks the enrollment completed, and flips the course to "completed".
exports.issueCertificates = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, ...TRAINING });
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "الدورة غير موجودة" });

    const enrollments = await Enrollment.find({
      course: course._id,
      certificate: { $in: [null, undefined] },
    });

    let issued = 0;
    for (const enr of enrollments) {
      const cert = await Certificate.create({
        source: "issued",
        title: course.title,
        certTitleEn: course.certTitleEn,
        user: enr.student, // recipient — surfaces in the student's certificates
        student: enr.student,
        course: course._id,
        serial: `${String(course._id).slice(-6).toUpperCase()}-${enr.student
          .toString()
          .slice(-4)
          .toUpperCase()}`,
        issuedAt: new Date(),
        academicYear: course.academicYear,
      });
      enr.certificate = cert._id;
      enr.completed = true;
      enr.completedAt = new Date();
      await enr.save();
      issued += 1;
    }

    course.status = "completed";
    await course.save();

    res.json({
      success: true,
      message: `تم إصدار ${issued} شهادة`,
      data: { issued },
    });
  } catch (error) {
    console.error("issueCertificates error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
