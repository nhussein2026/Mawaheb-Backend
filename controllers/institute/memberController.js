const bcrypt = require("bcrypt");
const User = require("../../models/User");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const {
  INSTITUTE_ROLES,
  INSTITUTE_STAFF_ROLES,
  INSTITUTE_ADMIN_ROLES,
} = require("../../utils/instituteEnums");

// Fields that live on the InstituteStudent profile (vs. the User record).
const STUDENT_PROFILE_FIELDS = [
  "academicNumber",
  "batch",
  "level",
  "seatType",
  "ideasBankBalance",
  "governorate",
  "district",
  "guardianName",
  "guardianMobile",
];

// GET /institute/members/stats
exports.getMemberStats = async (req, res) => {
  try {
    const [registeredStudents, supervisors, trainers, paidSeats] =
      await Promise.all([
        User.countDocuments({ instituteRole: "student" }),
        User.countDocuments({ instituteRole: { $in: INSTITUTE_ADMIN_ROLES } }),
        User.countDocuments({ instituteRole: "trainer" }),
        InstituteStudent.countDocuments({ seatType: "paid" }),
      ]);

    res.json({
      success: true,
      data: { registeredStudents, supervisors, trainers, paidSeats },
    });
  } catch (error) {
    console.error("getMemberStats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/members?group=all|staff|batch&batch=&level=&search=&page=&limit=
exports.listMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { group, batch, level, search } = req.query;

    const userFilter = { instituteRole: { $ne: null } };

    if (group === "staff") {
      userFilter.instituteRole = { $in: INSTITUTE_STAFF_ROLES };
    } else if (group === "batch" || batch || level) {
      // Restrict to students whose profile matches the batch/level filters.
      const profileFilter = {};
      if (batch) profileFilter.batch = batch;
      if (level) profileFilter.level = level;
      const profiles = await InstituteStudent.find(profileFilter)
        .select("user")
        .lean();
      userFilter._id = { $in: profiles.map((p) => p.user) };
      userFilter.instituteRole = "student";
    }

    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(userFilter);
    const users = await User.find(userFilter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach student profiles for student members.
    const studentIds = users
      .filter((u) => u.instituteRole === "student")
      .map((u) => u._id);
    const profiles = await InstituteStudent.find({
      user: { $in: studentIds },
    }).lean();
    const byUser = {};
    profiles.forEach((p) => {
      byUser[String(p.user)] = p;
    });
    users.forEach((u) => {
      if (u.instituteRole === "student") {
        u.studentProfile = byUser[String(u._id)] || null;
      }
    });

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: users,
    });
  } catch (error) {
    console.error("listMembers error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/members/:id  (single member with profile)
exports.getMember = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user)
      return res.status(404).json({ success: false, message: "العضو غير موجود" });

    if (user.instituteRole === "student") {
      user.studentProfile = await InstituteStudent.findOne({
        user: user._id,
      }).lean();
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("getMember error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/members
exports.createMember = async (req, res) => {
  try {
    const {
      name,
      full_name_en,
      email,
      username,
      password,
      instituteRole,
      phone_number,
      bio,
      guardianPin,
    } = req.body;

    if (!name || !email || !username || !password || !instituteRole) {
      return res.status(400).json({
        success: false,
        message: "الاسم والبريد واسم المستخدم وكلمة المرور والرتبة مطلوبة",
      });
    }
    if (!INSTITUTE_ROLES.includes(instituteRole)) {
      return res
        .status(400)
        .json({ success: false, message: "رتبة العضوية غير صالحة" });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل",
      });
    }

    const user = await User.create({
      name,
      full_name_en,
      email: email.toLowerCase(),
      username,
      password: await bcrypt.hash(password, 10),
      instituteRole,
      phone_number,
      bio,
    });

    // Student-specific academic & financial profile.
    if (instituteRole === "student") {
      const profileData = { user: user._id };
      STUDENT_PROFILE_FIELDS.forEach((f) => {
        if (req.body[f] !== undefined && req.body[f] !== "")
          profileData[f] = req.body[f];
      });
      if (guardianPin) {
        profileData.guardianPinHash = await bcrypt.hash(guardianPin, 10);
      }
      const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
      if (activeYear) profileData.academicYear = activeYear._id;

      await InstituteStudent.create(profileData);
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json({ success: true, data: safeUser });
  } catch (error) {
    console.error("createMember error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// PUT /institute/members/:id
exports.updateMember = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "العضو غير موجود" });

    const { name, full_name_en, email, instituteRole, phone_number, bio, password, guardianPin } =
      req.body;

    // Username is immutable after creation (spec §3) — silently ignored here.
    if (name !== undefined) user.name = name;
    if (full_name_en !== undefined) user.full_name_en = full_name_en;
    if (email !== undefined) user.email = email.toLowerCase();
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (bio !== undefined) user.bio = bio;
    if (instituteRole !== undefined) {
      if (!INSTITUTE_ROLES.includes(instituteRole)) {
        return res
          .status(400)
          .json({ success: false, message: "رتبة العضوية غير صالحة" });
      }
      user.instituteRole = instituteRole;
    }
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Upsert the student profile when the member is (now) a student.
    if (user.instituteRole === "student") {
      let profile = await InstituteStudent.findOne({ user: user._id });
      if (!profile) profile = new InstituteStudent({ user: user._id });

      STUDENT_PROFILE_FIELDS.forEach((f) => {
        if (req.body[f] !== undefined) profile[f] = req.body[f];
      });
      if (guardianPin) {
        profile.guardianPinHash = await bcrypt.hash(guardianPin, 10);
      }
      await profile.save();
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    console.error("updateMember error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// DELETE /institute/members/:id
exports.deleteMember = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "العضو غير موجود" });
    await InstituteStudent.deleteOne({ user: user._id });
    res.json({ success: true, message: "تم حذف العضو" });
  } catch (error) {
    console.error("deleteMember error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/batches  → distinct batch values (for dropdowns)
exports.listBatches = async (req, res) => {
  try {
    const batches = await InstituteStudent.distinct("batch", {
      batch: { $nin: [null, ""] },
    });
    batches.sort();
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error("listBatches error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/staff  → lightweight staff list for dropdowns (trainer pickers)
exports.listStaffLite = async (req, res) => {
  try {
    const staff = await User.find({
      instituteRole: { $in: INSTITUTE_STAFF_ROLES },
    })
      .select("name instituteRole")
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("listStaffLite error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /institute/students  → lightweight list for dropdowns (student pickers)
exports.listStudentsLite = async (req, res) => {
  try {
    const { batch } = req.query;
    const filter = {};
    if (batch) filter.batch = batch;

    const students = await InstituteStudent.find(filter)
      .populate("user", "name")
      .select("academicNumber batch level user")
      .sort({ academicNumber: 1 })
      .lean();

    res.json({ success: true, data: students });
  } catch (error) {
    console.error("listStudentsLite error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
