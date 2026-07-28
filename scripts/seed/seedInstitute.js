// Demo seed for the Institute Portal. Wipes the institute-domain collections
// and all @demo.mawaheb.org accounts, then creates a coherent dataset you can
// log into and click through (admin + staff + student + guardian).
//
//   node scripts/seed/seedInstitute.js       (or: npm run seed)
//
// Only removes @demo.mawaheb.org users, so it does NOT touch real accounts —
// but it DOES clear the institute domain collections (results, courses, ideas,
// threads, …) outright. That makes it a destructive script, so it refuses to
// run against anything that isn't obviously a scratch database; see
// assertSafeToSeed() at the bottom of this file.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const connectDB = require("../../config/db");

const User = require("../../models/User");
const InstituteStudent = require("../../models/InstituteStudent");
const AcademicYear = require("../../models/AcademicYear");
const Announcement = require("../../models/Announcement");
const Result = require("../../models/Result");
const Evaluation = require("../../models/Evaluation");
const BehaviorEntry = require("../../models/BehaviorEntry");
const LeaveRequest = require("../../models/LeaveRequest");
const Idea = require("../../models/Idea");
const UserAchievement = require("../../models/UserAchievement");
const Course = require("../../models/Course");
const Enrollment = require("../../models/Enrollment");
const Certificate = require("../../models/Certificate");
const Fee = require("../../models/Fee");
const Installment = require("../../models/Installment");
const Thread = require("../../models/Thread");
const ThreadMessage = require("../../models/ThreadMessage");

const DOMAIN = "@demo.mawaheb.org";
const PASSWORD = "password123";
const GUARDIAN_PIN = "1234";
const img = (t) => `https://placehold.co/600x400?text=${encodeURIComponent(t)}`;
const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function run() {
  const pwHash = await bcrypt.hash(PASSWORD, 10);
  const pinHash = await bcrypt.hash(GUARDIAN_PIN, 10);

  // ── wipe demo data ─────────────────────────────────────────
  const demoUsers = await User.find({ email: { $regex: `${DOMAIN}$` } })
    .select("_id")
    .lean();
  const demoIds = demoUsers.map((u) => u._id);
  await Promise.all([
    User.deleteMany({ email: { $regex: `${DOMAIN}$` } }),
    InstituteStudent.deleteMany({ user: { $in: demoIds } }),
    AcademicYear.deleteMany({}),
    Announcement.deleteMany({}),
    Result.deleteMany({}),
    Evaluation.deleteMany({}),
    BehaviorEntry.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Idea.deleteMany({}),
    UserAchievement.deleteMany({}),
    Course.deleteMany({ kind: "training" }),
    Enrollment.deleteMany({}),
    Certificate.deleteMany({ source: "issued" }),
    Fee.deleteMany({}),
    Installment.deleteMany({}),
    Thread.deleteMany({}),
    ThreadMessage.deleteMany({}),
  ]);
  console.log("• cleared previous demo data");

  // ── academic years ─────────────────────────────────────────
  const year = await AcademicYear.create({
    name: "2025/2026",
    startDate: new Date("2025-08-20"),
    endDate: new Date("2026-07-06"),
    isActive: true,
    trainingStartDate: new Date("2026-03-01"),
    trainingEndDate: new Date("2026-06-30"),
  });
  await AcademicYear.create({
    name: "2026/2027",
    startDate: new Date("2026-08-15"),
    endDate: new Date("2027-04-11"),
    isActive: false,
  });

  // ── staff accounts ─────────────────────────────────────────
  const mkUser = (name, email, role, instituteRole) =>
    User.create({ name, email, username: email.split("@")[0], password: pwHash, role, instituteRole });

  const superAdmin = await mkUser("أ. ناصر الشدادي", `admin${DOMAIN}`, "Admin", "super_admin");
  const supervisor = await mkUser("أ. سارة العمودي", `supervisor${DOMAIN}`, "User", "track_supervisor");
  const trainer = await mkUser("أ. طارق باجبير", `trainer${DOMAIN}`, "User", "trainer");
  await mkUser("أ. خالد بن عمر", `guard${DOMAIN}`, "User", "gate_guard");

  // ── student accounts + profiles ────────────────────────────
  const studentDefs = [
    { name: "عمر صالح الديني", num: "1101", level: "secondary_2", seat: "paid" },
    { name: "فيصل محمد العامري", num: "1102", level: "secondary_2", seat: "free" },
    { name: "حميد صلاح باجابر", num: "1103", level: "secondary_3", seat: "paid" },
    { name: "الحسين بن عثمان", num: "1104", level: "secondary_1", seat: "free" },
    { name: "أنس عبدالله بلفقيه", num: "1105", level: "university", seat: "free" },
    { name: "ياسر أحمد باوزير", num: "1106", level: "secondary_3", seat: "paid" },
  ];
  const students = [];
  for (const s of studentDefs) {
    const u = await User.create({
      name: s.name,
      email: `student${s.num}${DOMAIN}`,
      username: `student${s.num}`,
      password: pwHash,
      role: "Institute Student",
      instituteRole: "student",
    });
    const profile = await InstituteStudent.create({
      user: u._id,
      academicYear: year._id,
      academicNumber: s.num,
      batch: "11",
      level: s.level,
      seatType: s.seat,
      governorate: "حضرموت",
      district: "المكلا",
      guardianName: `والد ${s.name.split(" ")[0]}`,
      guardianMobile: "0500000000",
      guardianPinHash: pinHash,
      ideasBankBalance: 0,
    });
    students.push({ user: u, profile, ...s });
  }
  console.log(`• created ${students.length} students + 4 staff`);

  // ── announcements ──────────────────────────────────────────
  await Announcement.create([
    { title: "بداية الفصل الدراسي الثاني", content: "ننبه جميع الطلاب إلى بدء الدوام يوم الأحد.", targetScope: "all", targetRefs: [], publishStart: days(-3), publishEnd: days(20), academicYear: year._id, author: superAdmin._id },
    { title: "اجتماع الدفعة 11", content: "اجتماع مهم لطلاب الدفعة 11 بخصوص البرنامج التدريبي.", targetScope: "batch", targetRefs: ["11"], publishStart: days(-1), publishEnd: days(10), academicYear: year._id, author: supervisor._id },
    { title: "تنبيه لطلاب السنة الثالثة", content: "ورشة تحضيرية للاختبارات النهائية.", targetScope: "level", targetRefs: ["secondary_3"], publishStart: days(-1), publishEnd: days(15), academicYear: year._id, author: supervisor._id },
  ]);

  // ── results & evaluations (for the first student) ──────────
  const s1 = students[0].user._id;
  await Result.create([
    { student: s1, academicYear: year._id, term: "term_1", examType: "monthly_1", classification: "monthly", imageUrl: img("Result 1"), approvedBy: supervisor._id },
    { student: s1, academicYear: year._id, term: "term_1", examType: "term_end", classification: "term", imageUrl: img("Term Result"), approvedBy: supervisor._id },
  ]);
  await Evaluation.create([
    { student: s1, academicYear: year._id, periodType: "period_1", fileUrl: img("Evaluation P1"), notes: "أداء ممتاز وتحسّن ملحوظ.", approvedBy: supervisor._id },
  ]);

  // ── behavior entries ───────────────────────────────────────
  await BehaviorEntry.create([
    { student: s1, type: "positive", title: "مشاركة فعّالة", description: "شارك في تنظيم فعالية المعهد.", author: supervisor._id, academicYear: year._id },
    { student: s1, type: "negative", title: "تأخر عن الحصة", description: "تأخر 15 دقيقة عن الحصة الأولى.", author: supervisor._id, academicYear: year._id },
    { student: students[1].user._id, type: "positive", title: "تفوق دراسي", description: "الأول على الدفعة هذا الشهر.", author: supervisor._id, academicYear: year._id },
  ]);

  // ── leave requests ─────────────────────────────────────────
  await LeaveRequest.create([
    { student: s1, departureAt: days(1), returnAt: days(2), reason: "ظرف عائلي طارئ.", status: "pending", academicYear: year._id },
    { student: students[1].user._id, departureAt: days(-2), returnAt: days(-1), reason: "مراجعة طبية.", status: "approved", supervisorNotes: "بالتوفيق.", decidedBy: supervisor._id, decidedAt: days(-2), academicYear: year._id },
  ]);

  // ── ideas (one approved → bumps balance) ───────────────────
  await Idea.create([
    { student: s1, subject: "تطبيق لحجز قاعات المذاكرة", description: "فكرة لتنظيم استخدام القاعات.", status: "under_study", academicYear: year._id },
    { student: s1, subject: "نادي البرمجة الأسبوعي", description: "لقاء أسبوعي لتعلّم البرمجة.", status: "approved", rewardPoints: 15, pointsAwarded: true, notes: "فكرة ممتازة، تم الاعتماد.", reviewer: superAdmin._id, reviewedAt: days(-1), academicYear: year._id },
    { student: students[2].user._id, subject: "مبادرة تدوير الورق", description: "لتقليل الهدر داخل المعهد.", status: "under_study", academicYear: year._id },
  ]);
  await InstituteStudent.updateOne({ user: s1 }, { $set: { ideasBankBalance: 15 } });

  // ── achievements (institute-submitted → judging queue) ─────
  await UserAchievement.create([
    { title: "المركز الأول في مسابقة الرياضيات", description: "على مستوى المحافظة.", category: "جائزة", user: s1, fileUrl: img("Achievement"), reviewStatus: "pending", academicYear: year._id },
    { title: "شهادة إتمام دورة Python", description: "دورة تدريبية 40 ساعة.", category: "شهادة", user: students[1].user._id, reviewStatus: "approved", feedback: "إنجاز رائع.", reviewer: superAdmin._id, reviewedAt: days(-2), academicYear: year._id },
    { title: "مشروع روبوت تعليمي", description: "مشروع تخرج.", category: "مشروع", user: students[2].user._id, reviewStatus: "pending", academicYear: year._id },
  ]);

  // ── training courses + enrollments + one issued cert ───────
  const courseA = await Course.create({ kind: "training", title: "التخطيط التشغيلي", courseType: "standalone", certTitleEn: "Operational Planning", trainer: trainer._id, hours: 12, periodText: "24-25/6/2026", documentationDate: new Date("2026-06-25"), status: "completed", batches: ["11"], academicYear: year._id });
  const courseB = await Course.create({ kind: "training", title: "مهارات العرض والإلقاء", courseType: "program", programTitleAr: "برنامج القيادة", programTitleEn: "Leadership Program", certTitleEn: "Presentation Skills", trainer: trainer._id, hours: 8, periodText: "1-2/7/2026", documentationDate: new Date("2026-07-02"), status: "ongoing", batches: ["11"], academicYear: year._id });

  for (const st of students) {
    await Enrollment.create({ course: courseA._id, student: st.user._id, academicYear: year._id, enrolledVia: "batch", batch: "11" });
    await Enrollment.create({ course: courseB._id, student: st.user._id, academicYear: year._id, enrolledVia: "batch", batch: "11" });
  }
  // issue certificates for the completed course (A)
  for (const st of students) {
    const cert = await Certificate.create({
      source: "issued", title: courseA.title, certTitleEn: courseA.certTitleEn,
      user: st.user._id, student: st.user._id, course: courseA._id,
      serial: `${String(courseA._id).slice(-6).toUpperCase()}-${st.num}`,
      certificate_link: img("Certificate"), issuedAt: new Date(), academicYear: year._id,
    });
    await Enrollment.updateOne(
      { course: courseA._id, student: st.user._id },
      { $set: { completed: true, completedAt: new Date(), certificate: cert._id } }
    );
  }

  // ── fees & installments (paid-seat students) ───────────────
  for (const st of students.filter((s) => s.seat === "paid")) {
    const fee = await Fee.create({ student: st.user._id, academicYear: year._id, totalAnnual: 6250 });
    await Installment.create([
      { fee: fee._id, seq: 1, amount: 3125, dueDate: new Date("2025-09-01"), isPaid: st.num === "1101", paidAt: st.num === "1101" ? days(-30) : undefined, markedBy: st.num === "1101" ? superAdmin._id : undefined },
      { fee: fee._id, seq: 2, amount: 3125, dueDate: new Date("2026-01-01"), isPaid: false },
    ]);
  }

  // ── threads: correspondence, bug report, support ticket ────
  const corr = await Thread.create({ category: "correspondence", subject: "استفسار عن موعد الاختبار", body: "متى يبدأ اختبار نهاية الفصل؟", author: s1, recipients: [superAdmin._id, supervisor._id], status: "open", lastMessageAt: new Date(), lastMessageBy: s1, academicYear: year._id });
  await ThreadMessage.create({ thread: corr._id, author: supervisor._id, body: "يبدأ الاختبار الأسبوع القادم بإذن الله." });

  await Thread.create({ category: "bug_report", subject: "خطأ في عرض النتائج", body: "لا تظهر نتيجة الشهر الأول في حسابي.", moduleTag: "النتائج الدراسية", author: students[1].user._id, status: "pending", lastMessageAt: new Date(), lastMessageBy: students[1].user._id });

  const support = await Thread.create({ category: "support", subject: "تذكرة دعم فني تجريبية", body: "لا أستطيع تحديث بياناتي الشخصية.", author: students[2].user._id, status: "in_progress", lastMessageAt: new Date(), lastMessageBy: students[2].user._id });
  await ThreadMessage.create({ thread: support._id, author: superAdmin._id, body: "نعمل على حل المشكلة، شكراً لتواصلك." });

  console.log("• seeded all institute modules");
  printCredentials();
}

function printCredentials() {
  console.log("\n──────────── تسجيل الدخول (login) ────────────");
  console.log(`Password for ALL accounts:  ${PASSWORD}\n`);
  console.log("Admin portal  /institute-admin :");
  console.log(`  super admin        admin${DOMAIN}`);
  console.log(`  track supervisor   supervisor${DOMAIN}`);
  console.log(`  trainer            trainer${DOMAIN}`);
  console.log(`  gate guard         guard${DOMAIN}`);
  console.log("\nStudent portal  /institute-portal :");
  console.log(`  student1101${DOMAIN} … student1106${DOMAIN}`);
  console.log("\nGuardian portal  /guardian/login :");
  console.log(`  academic number: 1101 (…1106)   guardian PIN: ${GUARDIAN_PIN}`);
  console.log("──────────────────────────────────────────────\n");
}

// Hosts that can only ever be a developer's own machine or the docker-compose
// service (see docker-compose.yml: service `mongo`, container `mawaheb-mongo`).
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "mongo", "mawaheb-mongo"];

// MONGODB_URI → { host, db, srv }, or null if it can't be parsed. Rewrites the
// scheme so the standard URL parser accepts it.
function parseTarget(uri) {
  try {
    const url = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    return {
      host: url.hostname,
      db: url.pathname.replace(/^\//, "") || "test",
      srv: uri.startsWith("mongodb+srv://"),
    };
  } catch {
    return null;
  }
}

// Fails closed: anything we can't positively identify as a local scratch DB
// needs an explicit opt-in, and production has no opt-in at all.
function assertSafeToSeed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Refusing to seed: MONGODB_URI is not set.");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to seed: NODE_ENV=production.");
    console.error("   This script wipes every institute collection. There is no override.");
    process.exit(1);
  }

  const target = parseTarget(uri);
  if (!target) {
    console.error("❌ Refusing to seed: MONGODB_URI could not be parsed, so the");
    console.error("   target database can't be verified as a safe one to wipe.");
    process.exit(1);
  }

  // mongodb+srv is always a hosted cluster, never a local dev database.
  const isLocal = !target.srv && LOCAL_HOSTS.includes(target.host);
  if (!isLocal && process.env.SEED_CONFIRM !== target.db) {
    console.error(`❌ Refusing to seed: "${target.host}" is not a local database.`);
    console.error(`   Seeding wipes every institute collection on "${target.db}".`);
    console.error("   If that is genuinely what you want, name the database explicitly:");
    console.error(`     SEED_CONFIRM=${target.db} npm run seed`);
    process.exit(1);
  }

  console.log(`⚠️  Wiping and reseeding institute data on ${target.host}/${target.db}`);
}

assertSafeToSeed();

connectDB()
  .then(run)
  .then(() => mongoose.connection.close())
  .then(() => {
    console.log("✅ Seed complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
