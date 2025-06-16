const express = require("express");
const router = express.Router();
const studentReportController = require("../controllers/studentReportController");
const { authenticated, isAdmin } = require("../middlewares/authMiddleware");

// Routes for student reports
router.post(
  "/studentReport",
  authenticated,
  studentReportController.createStudentReport
);
router.get(
  "/studentReports",
  authenticated,
  studentReportController.getStudentReports
);
router.get(
  "/allReports",
  authenticated,
  isAdmin,
  studentReportController.allReports
);
router.get(
  "/studentReports/options",
  authenticated,
  studentReportController.getOptions
);
router.get(
  "/studentReport/:reportId",
  authenticated,
  studentReportController.getStudentReportById
);
router.put(
  "/studentReport/:reportId",
  authenticated,
  studentReportController.updateStudentReport
);
router.delete(
  "/studentReport/:reportId",
  authenticated,
  studentReportController.deleteStudentReport
);

module.exports = router;
