const Course = require("../models/Course");
const Note = require("../models/Note");
const Difficulty = require("../models/Difficulty");
const UserAchievement = require("../models/UserAchievement");
const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const StudentReport = require("../models/StudentReport");

const studentReportController = {
  createStudentReport: async (req, res) => {
    try {
      const {
        title,
        courseId,
        noteId,
        difficultyId,
        userAchievementId,
        eventId,
        date_of_report,
        certificateId,
      } = req.body;

      const newStudentReport = new StudentReport({
        title,
        user: req.user.id,
        courseId,
        noteId,
        difficultyId,
        userAchievementId,
        eventId,
        date_of_report,
        certificateId,
      });

      await newStudentReport.save();
      res.status(201).json({
        message: "Student report created",
        studentReport: newStudentReport,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getStudentReports: async (req, res) => {
    try {
      const studentReports = await StudentReport.find({ user: req.user.id })
        .populate("courseId")
        .populate("noteId")
        .populate("difficultyId")
        .populate("userAchievementId")
        .populate("eventId")
        .populate("certificateId");

      res.status(200).json({ studentReports });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getStudentReportById: async (req, res) => {
    try {
      const { reportId } = req.params;
      const studentReport = await StudentReport.findOne({
        _id: reportId,
        user: req.user.id,
      })
        .populate("courseId")
        .populate("noteId")
        .populate("difficultyId")
        .populate("userAchievementId")
        .populate("eventId")
        .populate("certificateId");

      if (!studentReport) {
        return res.status(404).json({ message: "Student report not found" });
      }

      res.status(200).json({ studentReport });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateStudentReport: async (req, res) => {
    try {
      const { reportId } = req.params;
      const updates = req.body;

      const studentReport = await StudentReport.findOneAndUpdate(
        { _id: reportId, userId: req.user.id },
        updates,
        { new: true }
      )
        .populate("courseId")
        .populate("noteId")
        .populate("difficultyId")
        .populate("userAchievementId")
        .populate("eventId")
        .populate("certificateId");

      if (!studentReport) {
        return res.status(404).json({ message: "Student report not found" });
      }

      res
        .status(200)
        .json({ message: "Student report updated", studentReport });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  deleteStudentReport: async (req, res) => {
    try {
      const { reportId } = req.params;

      const studentReport = await StudentReport.findOneAndDelete({
        _id: reportId,
        userId: req.user.id,
      });

      if (!studentReport) {
        return res.status(404).json({ message: "Student report not found" });
      }

      res.status(200).json({ message: "Student report deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get options filtered by user ID
  getOptions: async (req, res) => {
    try {
      const userId = req.user.id;

      const [
        courses,
        notes,
        difficulties,
        userAchievements,
        events,
        certificates,
      ] = await Promise.all([
        Course.find({ user: userId }),
        Note.find({ user: userId }),
        Difficulty.find({ user: userId }),
        UserAchievement.find({ user: userId }),
        Event.find({ user: userId }),
        Certificate.find({ user: userId }),
      ]);

      res.status(200).json({
        courses,
        notes,
        difficulties,
        userAchievements,
        events,
        certificates,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  allReports: async (req, res) => {
    try {
      // Remove the filtering by userId to get all reports
      const studentReports = await StudentReport.find()
        .populate("courseId")
        .populate("noteId")
        .populate("difficultyId")
        .populate("userAchievementId")
        .populate("eventId")
        .populate("certificateId");

      res.status(200).json({ studentReports });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = studentReportController;
