// routes/semesterRoutes.js
const express = require("express");
const router = express.Router();
const semesterController = require("../controllers/semesterController");
const { authenticated } = require("../middlewares/authMiddleware");

router.post("/", authenticated, semesterController.createSemester);
router.get("/all", authenticated, semesterController.getAllSemesters);
router.get("/:id", authenticated, semesterController.getSemesterById);
router.put("/:id", authenticated, semesterController.updateSemester);
router.delete("/:id", authenticated, semesterController.deleteSemester);

module.exports = router;
