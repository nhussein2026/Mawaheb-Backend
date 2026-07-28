const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const Idea = require("../../models/Idea");
const UserAchievement = require("../../models/UserAchievement");
const Fee = require("../../models/Fee");
const Installment = require("../../models/Installment");
const Thread = require("../../models/Thread");
const User = require("../../models/User");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { INSTITUTE_STAFF_ROLES } = require("../../utils/instituteEnums");

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // "online" = seen in the last 5 minutes

// Installment stats for the seats/finance widget, scoped to a year.
async function installmentStats(yearId) {
  const academicYear =
    yearId || (await AcademicYear.findOne({ isActive: true }).lean())?._id;
  const fees = await Fee.find(academicYear ? { academicYear } : {})
    .select("_id")
    .lean();
  const feeIds = fees.map((f) => f._id);
  const installments = await Installment.find({ fee: { $in: feeIds } }).lean();

  const now = new Date();
  const isOverdue = (i) => !i.isPaid && i.dueDate && new Date(i.dueDate) <= now;

  return {
    paidFirstInstallment: installments.filter((i) => i.seq === 1 && i.isPaid).length,
    paidSecondInstallment: installments.filter((i) => i.seq === 2 && i.isPaid).length,
    overdueFirstInstallment: installments.filter((i) => i.seq === 1 && isOverdue(i)).length,
    overdueSecondInstallment: installments.filter((i) => i.seq === 2 && isOverdue(i)).length,
  };
}

// GET /institute/dashboard?academicYear=<id|all>
// Aggregate widgets for the institute super-admin landing page (spec §1).
exports.getDashboard = async (req, res) => {
  try {
    const { filter, yearId } = await resolveYearScope(req);

    const students = await InstituteStudent.find(filter)
      .select("level seatType")
      .lean();

    const isSecondary = (lvl) =>
      ["secondary_1", "secondary_2", "secondary_3"].includes(lvl);

    const studentStats = {
      registered: students.length,
      secondary: students.filter((s) => isSecondary(s.level)).length,
      university: students.filter((s) => s.level === "university").length,
      graduated: students.filter((s) => s.level === "graduate").length,
    };

    const sinceOnline = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [
      approvedIdeas,
      approvedAchievements,
      openMessages,
      installments,
      supervisorsOnline,
      studentsOnline,
    ] = await Promise.all([
        Idea.countDocuments({ ...filter, status: "approved" }),
        UserAchievement.countDocuments({ ...filter, reviewStatus: "approved" }),
        Thread.countDocuments({ category: "correspondence", status: "open" }),
        installmentStats(yearId),
        // Compute-on-request presence (no realtime infra — see plan §1/§9).
        User.countDocuments({
          instituteRole: { $in: INSTITUTE_STAFF_ROLES },
          lastSeenAt: { $gte: sinceOnline },
        }),
        User.countDocuments({
          instituteRole: "student",
          lastSeenAt: { $gte: sinceOnline },
        }),
      ]);

    const seatStats = {
      freeSeats: students.filter((s) => s.seatType === "free").length,
      paidSeats: students.filter((s) => s.seatType === "paid").length,
      ...installments,
    };

    res.json({
      success: true,
      data: {
        online: { supervisorsOnline, studentsOnline },
        platform: {
          openMessages, // Correspondence module (§9)
          approvedAchievements, // Achievements module (§12)
          approvedIdeas,
        },
        students: studentStats,
        seats: seatStats,
      },
    });
  } catch (error) {
    console.error("Institute dashboard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
