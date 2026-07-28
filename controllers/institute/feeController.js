const Fee = require("../../models/Fee");
const Installment = require("../../models/Installment");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { recordAudit } = require("../../utils/auditLog");

// Fees are inherently per-year; resolve an effective year id (fall back to the
// active year when the switcher is on "all").
async function effectiveYearId(req) {
  const { yearId } = await resolveYearScope(req);
  if (yearId) return yearId;
  const active = await AcademicYear.findOne({ isActive: true }).lean();
  return active?._id || null;
}

// Ensure a Fee + its two 50% installments exist for a paid-seat student.
async function ensureFee(studentUserId, academicYear) {
  let fee = await Fee.findOne({ student: studentUserId, academicYear });
  if (!fee) {
    fee = await Fee.create({ student: studentUserId, academicYear, totalAnnual: 0 });
  }
  const existing = await Installment.find({ fee: fee._id }).lean();
  const have = new Set(existing.map((i) => i.seq));
  const half = (fee.totalAnnual || 0) / 2;
  for (const seq of [1, 2]) {
    if (!have.has(seq)) {
      await Installment.create({ fee: fee._id, seq, amount: half });
    }
  }
  return fee;
}

// GET /institute/fees/stats?academicYear=
exports.getFeeStats = async (req, res) => {
  try {
    const academicYear = await effectiveYearId(req);
    const paidSeatProfiles = await InstituteStudent.find({ seatType: "paid" })
      .select("user")
      .lean();
    const studentIds = paidSeatProfiles.map((p) => p.user);

    const fees = await Fee.find({
      student: { $in: studentIds },
      academicYear,
    }).lean();
    const feeIds = fees.map((f) => f._id);
    const installments = await Installment.find({ fee: { $in: feeIds } }).lean();

    // "Latest due installment" = highest-seq installment with a due date reached.
    const byFee = {};
    installments.forEach((i) => {
      (byFee[String(i.fee)] = byFee[String(i.fee)] || []).push(i);
    });

    let paidLatest = 0;
    let unpaidLatest = 0;
    Object.values(byFee).forEach((list) => {
      const due = list
        .filter((i) => i.dueDate && new Date(i.dueDate) <= new Date())
        .sort((a, b) => b.seq - a.seq);
      const latest = due[0] || list.sort((a, b) => b.seq - a.seq)[0];
      if (latest) latest.isPaid ? paidLatest++ : unpaidLatest++;
    });

    res.json({
      success: true,
      data: {
        paidSeatStudents: studentIds.length,
        paidLatest,
        unpaidLatest,
      },
    });
  } catch (error) {
    console.error("getFeeStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/fees?academicYear=   (only paid-seat students appear)
exports.listFees = async (req, res) => {
  try {
    const academicYear = await effectiveYearId(req);
    const profiles = await InstituteStudent.find({ seatType: "paid" })
      .populate("user", "name")
      .select("user")
      .lean();

    const rows = [];
    for (const p of profiles) {
      if (!p.user) continue;
      const fee = await ensureFee(p.user._id, academicYear);
      const installments = await Installment.find({ fee: fee._id })
        .sort({ seq: 1 })
        .lean();
      rows.push({
        student: p.user,
        fee,
        installments,
      });
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("listFees error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/fees/:studentId   (set total annual → recompute 50% halves)
exports.setFeeTotal = async (req, res) => {
  try {
    const academicYear = await effectiveYearId(req);
    const { totalAnnual } = req.body;
    const total = Number(totalAnnual) || 0;

    const fee = await ensureFee(req.params.studentId, academicYear);
    fee.totalAnnual = total;
    await fee.save();

    // Recompute amounts only on installments that are still unpaid.
    const half = total / 2;
    await Installment.updateMany(
      { fee: fee._id, isPaid: false },
      { $set: { amount: half } }
    );

    const installments = await Installment.find({ fee: fee._id })
      .sort({ seq: 1 })
      .lean();
    res.json({ success: true, data: { fee, installments } });
  } catch (error) {
    console.error("setFeeTotal error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/fees/installments/:id/toggle   (mark paid / cancel — audited)
exports.toggleInstallment = async (req, res) => {
  try {
    const installment = await Installment.findById(req.params.id);
    if (!installment)
      return res.status(404).json({ success: false, message: "القسط غير موجود" });

    const wasPaid = installment.isPaid;
    installment.isPaid = !wasPaid;
    installment.paidAt = installment.isPaid ? new Date() : null;
    installment.markedBy = req.user.id;
    await installment.save();

    await recordAudit({
      entity: "Installment",
      entityId: installment._id,
      action: installment.isPaid ? "installment.mark_paid" : "installment.cancel_payment",
      actor: req.user.id,
      meta: { fee: installment.fee, seq: installment.seq, amount: installment.amount },
    });

    res.json({ success: true, data: installment });
  } catch (error) {
    console.error("toggleInstallment error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
