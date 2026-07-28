// Shared enums/constants for the Institute Portal (بوابة معهد حضرموت للموهوبين).
// Stable machine keys are stored in the DB; Arabic labels live on the frontend
// (src/constants/institute.js) so display text stays in one place per layer.

// Membership ranks (spec §"Global roles / enums")
const INSTITUTE_ROLES = [
  "super_admin", // 👑 مشرف عام
  "track_supervisor", // 🎯 مشرف مسار
  "trainer", // 🛡️ مدرب
  "gate_guard", // 🚗 حارس بوابة
  "student", // 🎓 طالب / عضو عادي
];

// Academic level classification (spec §"Academic levels")
const ACADEMIC_LEVELS = [
  "secondary_1", // ثانوي - السنة الأولى
  "secondary_2", // ثانوي - السنة الثانية
  "secondary_3", // ثانوي - السنة الثالثة
  "post_secondary_training", // الفصل التدريبي بعد الثانوية
  "university", // طلاب مستوى جامعي
  "graduate", // طلاب خريجين
];

// Seat type (spec §"Seat type enum")
const SEAT_TYPES = ["free", "paid"];

// Ranks that can administer the institute portal
const INSTITUTE_ADMIN_ROLES = ["super_admin", "track_supervisor"];

// Any staff rank (non-student) inside the portal
const INSTITUTE_STAFF_ROLES = [
  "super_admin",
  "track_supervisor",
  "trainer",
  "gate_guard",
];

// ── Announcements (spec §4) ───────────────────────────────────
// Who an announcement targets. `targetRefs` on the record carries the level
// keys / batch values when scope is "level" / "batch".
const ANNOUNCEMENT_SCOPES = ["all", "level", "batch", "supervisors"];

// ── Academic Results (spec §6) ────────────────────────────────
const RESULT_TERMS = ["term_1", "term_2"]; // الفصل الأول / الثاني
const RESULT_EXAM_TYPES = [
  "monthly_1", // الاختبار الشهري الأول
  "monthly_2", // الاختبار الشهري الثاني
  "term_end", // اختبار نهاية الفصل الدراسي
  "year_end", // اختبار نهاية العام الدراسي
];
const RESULT_CLASSIFICATIONS = ["monthly", "term", "final"]; // شهري/فصلي/نهائي

// ── Evaluation Reports (spec §7) ──────────────────────────────
const EVALUATION_PERIODS = [
  "period_1", // تقرير الفترة الأولى
  "period_2", // تقرير الفترة الثانية
  "term_1", // تقرير الفصل الدراسي الأول
  "period_3", // تقرير الفترة الثالثة
  "period_4", // تقرير الفترة الرابعة
  "year_end", // تقرير ختام العام الدراسي
  "summer", // تقرير النشاط الصيفي
];

// ── Courses & Programs (spec §8) ──────────────────────────────
const COURSE_KINDS = ["personal", "training"]; // unified Course discriminator
const COURSE_TYPES = ["standalone", "program"]; // training course nature
const COURSE_STATUSES = ["ongoing", "completed"];
const CERTIFICATE_SOURCES = ["self_logged", "issued"]; // unified Certificate

// ── Correspondence / Bug Reports / Support (spec §5 + §9) ─────
const THREAD_CATEGORIES = ["support", "correspondence", "bug_report"];
const THREAD_STATUSES_BY_CATEGORY = {
  support: ["open", "in_progress", "resolved", "closed"],
  correspondence: ["open", "closed"],
  bug_report: ["pending", "in_progress", "resolved"],
};

// ── Behavior Log (spec §10) ───────────────────────────────────
const BEHAVIOR_TYPES = ["positive", "negative"]; // إيجابي (+) / سلبي (-)

// ── Leave Requests (spec §11) ─────────────────────────────────
const LEAVE_STATUSES = ["pending", "approved", "rejected"];

// ── Achievements (spec §12) — unified review workflow ─────────
// "none" = self-logged (scholarship/general), no judging needed.
const ACHIEVEMENT_REVIEW_STATUSES = ["none", "pending", "approved", "rejected"];

// ── Ideas Bank (spec §13) ─────────────────────────────────────
const IDEA_STATUSES = ["under_study", "approved", "rejected"];

// ── Fees & Installments (spec §14) ────────────────────────────
const INSTALLMENT_SEQUENCES = [1, 2]; // two 50% installments

module.exports = {
  INSTITUTE_ROLES,
  ACADEMIC_LEVELS,
  SEAT_TYPES,
  INSTITUTE_ADMIN_ROLES,
  INSTITUTE_STAFF_ROLES,
  ANNOUNCEMENT_SCOPES,
  RESULT_TERMS,
  RESULT_EXAM_TYPES,
  RESULT_CLASSIFICATIONS,
  EVALUATION_PERIODS,
  COURSE_KINDS,
  COURSE_TYPES,
  COURSE_STATUSES,
  CERTIFICATE_SOURCES,
  THREAD_CATEGORIES,
  THREAD_STATUSES_BY_CATEGORY,
  BEHAVIOR_TYPES,
  LEAVE_STATUSES,
  ACHIEVEMENT_REVIEW_STATUSES,
  IDEA_STATUSES,
  INSTALLMENT_SEQUENCES,
};
