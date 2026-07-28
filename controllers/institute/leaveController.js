const LeaveRequest = require("../../models/LeaveRequest");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { LEAVE_STATUSES } = require("../../utils/instituteEnums");

// GET /institute/leave/stats?academicYear=
exports.getLeaveStats = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const [total, pending, approved, leftNotReturned] = await Promise.all([
      LeaveRequest.countDocuments(filter),
      LeaveRequest.countDocuments({ ...filter, status: "pending" }),
      LeaveRequest.countDocuments({ ...filter, status: "approved" }),
      LeaveRequest.countDocuments({
        ...filter,
        checkedOutAt: { $ne: null },
        returnedAt: null,
      }),
    ]);
    res.json({
      success: true,
      data: { total, pending, approved, leftNotReturned },
    });
  } catch (error) {
    console.error("getLeaveStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/leave?status=&academicYear=
exports.listLeave = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    if (req.query.status) filter.status = req.query.status;

    const data = await LeaveRequest.find(filter)
      .populate("student", "name")
      .populate("decidedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Attach batch/level from the student profile for the table.
    const studentIds = data.map((r) => r.student?._id).filter(Boolean);
    const profiles = await InstituteStudent.find({ user: { $in: studentIds } })
      .select("user batch level")
      .lean();
    const byUser = {};
    profiles.forEach((p) => (byUser[String(p.user)] = p));
    data.forEach((r) => {
      r.studentProfile = r.student ? byUser[String(r.student._id)] || null : null;
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("listLeave error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/leave   (student submits their own request)
exports.createLeave = async (req, res) => {
  try {
    const { departureAt, returnAt, reason } = req.body;
    if (!departureAt || !returnAt || !reason) {
      return res.status(400).json({
        success: false,
        message: "تاريخ المغادرة والعودة والسبب مطلوبة",
      });
    }
    const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
    const request = await LeaveRequest.create({
      student: req.user.id,
      departureAt,
      returnAt,
      reason,
      academicYear: activeYear?._id,
    });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    console.error("createLeave error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/leave/:id/decision   (supervisor approves/rejects)
exports.processLeave = async (req, res) => {
  try {
    const { status, supervisorNotes } = req.body;
    if (!LEAVE_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "قرار غير صالح" });
    }

    const request = await LeaveRequest.findById(req.params.id);
    if (!request)
      return res.status(404).json({ success: false, message: "الطلب غير موجود" });

    request.status = status;
    if (supervisorNotes !== undefined) request.supervisorNotes = supervisorNotes;
    request.decidedBy = req.user.id;
    request.decidedAt = new Date();
    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    console.error("processLeave error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/leave/:id/gate   (gate guard check-out / check-in)
exports.updateGate = async (req, res) => {
  try {
    const { action } = req.body; // "check_out" | "check_in"
    const request = await LeaveRequest.findById(req.params.id);
    if (!request)
      return res.status(404).json({ success: false, message: "الطلب غير موجود" });

    if (action === "check_out") request.checkedOutAt = new Date();
    else if (action === "check_in") request.returnedAt = new Date();
    else
      return res.status(400).json({ success: false, message: "إجراء غير صالح" });

    await request.save();
    res.json({ success: true, data: request });
  } catch (error) {
    console.error("updateGate error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
