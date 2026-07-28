// Guardian read-only portal (spec §6.15). Guardians are NOT users — access is
// via the student's academic number + guardian PIN, which mints a short-lived
// token scoped to that one student. Every read below is limited to
// req.guardian.studentUserId. Viewing results/evaluations stamps
// guardianViewedAt so admins can see the guardian has seen them.
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const InstituteStudent = require("../../models/InstituteStudent");
const Result = require("../../models/Result");
const Evaluation = require("../../models/Evaluation");
const BehaviorEntry = require("../../models/BehaviorEntry");
const Fee = require("../../models/Fee");
const Installment = require("../../models/Installment");

const fail = (res, error, where) => {
  console.error(`${where} error:`, error);
  res.status(500).json({ success: false, message: "Server error" });
};

// POST /institute/guardian/login   ({ academicNumber, pin })
exports.login = async (req, res) => {
  try {
    const { academicNumber, pin } = req.body;
    if (!academicNumber || !pin) {
      return res.status(400).json({
        success: false,
        message: "الرقم الأكاديمي ورمز ولي الأمر مطلوبان",
      });
    }

    const profile = await InstituteStudent.findOne({ academicNumber })
      .select("+guardianPinHash")
      .populate("user", "name")
      .lean();

    if (!profile || !profile.guardianPinHash) {
      return res
        .status(401)
        .json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    const match = await bcrypt.compare(String(pin), profile.guardianPinHash);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    const guardian = {
      studentUserId: profile.user._id,
      studentName: profile.user.name,
      academicNumber: profile.academicNumber,
      batch: profile.batch || null,
      level: profile.level || null,
    };
    const token = jwt.sign({ guardian }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "12h",
    });

    res.json({ success: true, token, student: guardian });
  } catch (error) {
    fail(res, error, "guardianLogin");
  }
};

// GET /institute/guardian/overview
exports.getOverview = async (req, res) => {
  try {
    const sid = req.guardian.studentUserId;
    const [results, evaluations, behavior, unseenResults, unseenEvaluations] =
      await Promise.all([
        Result.countDocuments({ student: sid }),
        Evaluation.countDocuments({ student: sid }),
        BehaviorEntry.countDocuments({ student: sid }),
        Result.countDocuments({ student: sid, guardianViewedAt: null }),
        Evaluation.countDocuments({ student: sid, guardianViewedAt: null }),
      ]);

    res.json({
      success: true,
      data: {
        student: req.guardian,
        counts: {
          results,
          evaluations,
          behavior,
          unseen: unseenResults + unseenEvaluations,
        },
      },
    });
  } catch (error) {
    fail(res, error, "guardianOverview");
  }
};

// GET /institute/guardian/results   (stamps guardianViewedAt)
exports.getResults = async (req, res) => {
  try {
    const sid = req.guardian.studentUserId;
    await Result.updateMany(
      { student: sid, guardianViewedAt: null },
      { $set: { guardianViewedAt: new Date() } }
    );
    const data = await Result.find({ student: sid })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, "guardianResults");
  }
};

// GET /institute/guardian/evaluations   (stamps guardianViewedAt)
exports.getEvaluations = async (req, res) => {
  try {
    const sid = req.guardian.studentUserId;
    await Evaluation.updateMany(
      { student: sid, guardianViewedAt: null },
      { $set: { guardianViewedAt: new Date() } }
    );
    const data = await Evaluation.find({ student: sid })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, "guardianEvaluations");
  }
};

// GET /institute/guardian/behavior
exports.getBehavior = async (req, res) => {
  try {
    const data = await BehaviorEntry.find({ student: req.guardian.studentUserId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, "guardianBehavior");
  }
};

// GET /institute/guardian/fees
exports.getFees = async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.guardian.studentUserId }).lean();
    const installments = await Installment.find({
      fee: { $in: fees.map((f) => f._id) },
    })
      .sort({ seq: 1 })
      .lean();
    res.json({ success: true, data: { fees, installments } });
  } catch (error) {
    fail(res, error, "guardianFees");
  }
};
