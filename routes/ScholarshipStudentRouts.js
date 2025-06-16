const express = require("express");
const router = express.Router();
const scholarshipStudentController = require("../controllers/ScholarshipStudentController");
const { authenticated } = require("../middlewares/authMiddleware");

// Apply authentication middleware to all routes

router.post(
  "/",
  authenticated,
  scholarshipStudentController.createScholarshipStudent
);
router.get(
  "/",
  authenticated,
  scholarshipStudentController.getAllScholarshipStudents
);
router.get(
  "/:id",
  authenticated,
  scholarshipStudentController.getScholarshipStudentById
);
router.put(
  "/:id",
  authenticated,
  scholarshipStudentController.updateScholarshipStudent
);
router.delete(
  "/:id",
  authenticated,
  scholarshipStudentController.deleteScholarshipStudent
);

module.exports = router;
