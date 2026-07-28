const express = require("express");
const router = express.Router();

const {
  authenticated,
  isInstituteAdmin,
  isInstituteStaff,
  isInstituteStudent,
  guardianAuth,
} = require("../middlewares/authMiddleware");
const { uploadDoc } = require("../utils/uploads");

const dashboardController = require("../controllers/institute/dashboardController");
const yearController = require("../controllers/institute/academicYearController");
const memberController = require("../controllers/institute/memberController");
const announcementController = require("../controllers/institute/announcementController");
const behaviorController = require("../controllers/institute/behaviorController");
const leaveController = require("../controllers/institute/leaveController");
const ideaController = require("../controllers/institute/ideaController");
const feeController = require("../controllers/institute/feeController");
const resultController = require("../controllers/institute/resultController");
const evaluationController = require("../controllers/institute/evaluationController");
const threadController = require("../controllers/institute/threadController");
const courseController = require("../controllers/institute/courseController");
const achievementController = require("../controllers/institute/achievementController");
const studentController = require("../controllers/institute/studentController");
const guardianController = require("../controllers/institute/guardianController");

// ─────────────────────────────────────────────────────────────
// Student-facing submit endpoints. Declared BEFORE the admin guard
// below so they run under `isInstituteStudent` instead. (Phase D wires
// the full student portal UI; the write endpoints live here already.)
// ─────────────────────────────────────────────────────────────
router.post(
  "/leave",
  authenticated,
  isInstituteStudent,
  leaveController.createLeave
);
router.post(
  "/ideas",
  authenticated,
  isInstituteStudent,
  ideaController.createIdea
);
router.post(
  "/achievements",
  authenticated,
  isInstituteStudent,
  uploadDoc.single("file"),
  achievementController.createAchievement
);

// Student self-service reads (spec §6 "student face"). Each is scoped to the
// logged-in student inside the controller.
const asStudent = [authenticated, isInstituteStudent];
router.get("/me/overview", asStudent, studentController.getOverview);
router.get("/me/announcements", asStudent, studentController.getAnnouncements);
router.get("/me/results", asStudent, studentController.getResults);
router.get("/me/evaluations", asStudent, studentController.getEvaluations);
router.get("/me/behavior", asStudent, studentController.getBehavior);
router.get("/me/leave", asStudent, studentController.getLeave);
router.get("/me/ideas", asStudent, studentController.getIdeas);
router.get("/me/achievements", asStudent, studentController.getAchievements);
router.get("/me/courses", asStudent, studentController.getCourses);
router.get("/me/certificates", asStudent, studentController.getCertificates);
router.get("/me/fees", asStudent, studentController.getFees);

// Student correspondence & bug threads (spec §5/§9 "student face").
router.get("/me/correspondence", asStudent, studentController.listMyThreads("correspondence"));
router.post(
  "/me/correspondence",
  asStudent,
  uploadDoc.array("attachments", 5),
  studentController.createMyThread("correspondence")
);
router.get("/me/bugs", asStudent, studentController.listMyThreads("bug_report"));
router.post(
  "/me/bugs",
  asStudent,
  uploadDoc.array("attachments", 5),
  studentController.createMyThread("bug_report")
);
router.get("/me/threads/:id", asStudent, studentController.getMyThread);
router.post(
  "/me/threads/:id/reply",
  asStudent,
  uploadDoc.array("attachments", 5),
  studentController.replyMyThread
);

// ─────────────────────────────────────────────────────────────
// Guardian read-only portal (spec §6.15). Login is public; the reads
// run under `guardianAuth`, scoped to one student. No user account.
// ─────────────────────────────────────────────────────────────
router.post("/guardian/login", guardianController.login);
router.get("/guardian/overview", guardianAuth, guardianController.getOverview);
router.get("/guardian/results", guardianAuth, guardianController.getResults);
router.get("/guardian/evaluations", guardianAuth, guardianController.getEvaluations);
router.get("/guardian/behavior", guardianAuth, guardianController.getBehavior);
router.get("/guardian/fees", guardianAuth, guardianController.getFees);

// ─────────────────────────────────────────────────────────────
// Everything below requires authenticated institute staff (any rank).
// Sensitive route groups (academic years, members, fees) add an extra
// `isInstituteAdmin` guard so only Admin/super/track can touch them (§3.3).
// ─────────────────────────────────────────────────────────────
router.use(authenticated, isInstituteStaff);

// ── Dashboard (§1) ───────────────────────────────────────────
router.get("/dashboard", dashboardController.getDashboard);

// ── Academic years & students (§2) — admin only ──────────────
router.get("/academic-years", isInstituteAdmin, yearController.listYears);
router.post("/academic-years", isInstituteAdmin, yearController.createYear);
router.put("/academic-years/:id", isInstituteAdmin, yearController.updateYear);
router.delete("/academic-years/:id", isInstituteAdmin, yearController.deleteYear);
router.put("/academic-years/:id/training", isInstituteAdmin, yearController.saveTrainingWindow);

router.get("/students/promotable", isInstituteAdmin, yearController.getPromotableStudents);
router.post("/students/promote", isInstituteAdmin, yearController.promoteStudents);

// ── Members & trainers (§3) — admin only ─────────────────────
router.get("/members/stats", isInstituteAdmin, memberController.getMemberStats);
router.get("/members", isInstituteAdmin, memberController.listMembers);
router.post("/members", isInstituteAdmin, memberController.createMember);
router.get("/members/:id", isInstituteAdmin, memberController.getMember);
router.put("/members/:id", isInstituteAdmin, memberController.updateMember);
router.delete("/members/:id", isInstituteAdmin, memberController.deleteMember);

// ── Announcements (§4) ───────────────────────────────────────
router.get("/announcements", announcementController.listAnnouncements);
router.post("/announcements", announcementController.createAnnouncement);
router.put("/announcements/:id", announcementController.updateAnnouncement);
router.delete("/announcements/:id", announcementController.deleteAnnouncement);

// ── Behavior log (§10) ───────────────────────────────────────
router.get("/behavior/stats", behaviorController.getBehaviorStats);
router.get("/behavior", behaviorController.listBehavior);
router.post(
  "/behavior",
  uploadDoc.single("attachment"),
  behaviorController.createBehavior
);
router.delete("/behavior/:id", behaviorController.deleteBehavior);

// ── Leave requests (§11) ─────────────────────────────────────
router.get("/leave/stats", leaveController.getLeaveStats);
router.get("/leave", leaveController.listLeave);
router.put("/leave/:id/decision", leaveController.processLeave);
router.put("/leave/:id/gate", leaveController.updateGate);

// ── Academic results (§6) ────────────────────────────────────
router.get("/results", resultController.listResults);
router.post(
  "/results",
  uploadDoc.single("image"),
  resultController.createResult
);
router.put("/results/:id/guardian-viewed", resultController.markGuardianViewed);
router.delete("/results/:id", resultController.deleteResult);

// ── Evaluation reports (§7) ──────────────────────────────────
router.get("/evaluations", evaluationController.listEvaluations);
router.post(
  "/evaluations",
  uploadDoc.single("file"),
  evaluationController.createEvaluation
);
router.put(
  "/evaluations/:id/guardian-viewed",
  evaluationController.markGuardianViewed
);
router.delete("/evaluations/:id", evaluationController.deleteEvaluation);

// ── Ideas bank (§13) ─────────────────────────────────────────
router.get("/ideas/stats", ideaController.getIdeaStats);
router.get("/ideas", ideaController.listIdeas);
router.put("/ideas/:id/judge", ideaController.judgeIdea);

// ── Correspondence & tickets (§9) — Thread core ──────────────
router.get("/correspondence/stats", threadController.getStats("correspondence"));
router.get("/correspondence", threadController.listThreads("correspondence"));
router.get("/correspondence/:id", threadController.getThread);
router.post(
  "/correspondence",
  uploadDoc.array("attachments", 5),
  threadController.createThread("correspondence")
);
router.post(
  "/correspondence/:id/reply",
  uploadDoc.array("attachments", 5),
  threadController.replyThread
);
router.put("/correspondence/:id/status", threadController.setStatus);

// ── Issues & errors / bug reports (§5) — Thread core ─────────
router.get("/bugs/stats", threadController.getStats("bug_report"));
router.get("/bugs", threadController.listThreads("bug_report"));
router.get("/bugs/:id", threadController.getThread);
router.post(
  "/bugs",
  uploadDoc.array("attachments", 5),
  threadController.createThread("bug_report")
);
router.post(
  "/bugs/:id/reply",
  uploadDoc.array("attachments", 5),
  threadController.replyThread
);
router.put("/bugs/:id/status", threadController.setStatus);

// ── Courses & programs (§8) ──────────────────────────────────
router.get("/courses/stats", courseController.getCourseStats);
router.get("/courses", courseController.listCourses);
router.post("/courses", courseController.createCourse);
router.put("/courses/:id", courseController.updateCourse);
router.delete("/courses/:id", courseController.deleteCourse);
router.post(
  "/courses/:id/issue-certificates",
  courseController.issueCertificates
);

// ── Achievements (§12) — judging ─────────────────────────────
router.get("/achievements/stats", achievementController.getAchievementStats);
router.get("/achievements", achievementController.listAchievements);
router.put("/achievements/:id/judge", achievementController.judgeAchievement);

// ── Fees & installments (§14) — admin only (financial mutations) ──
router.get("/fees/stats", isInstituteAdmin, feeController.getFeeStats);
router.get("/fees", isInstituteAdmin, feeController.listFees);
router.put("/fees/installments/:id/toggle", isInstituteAdmin, feeController.toggleInstallment);
router.put("/fees/:studentId", isInstituteAdmin, feeController.setFeeTotal);

// ── Shared lookups (dropdowns) ───────────────────────────────
router.get("/batches", memberController.listBatches);
router.get("/students", memberController.listStudentsLite);
router.get("/staff", memberController.listStaffLite);

module.exports = router;
