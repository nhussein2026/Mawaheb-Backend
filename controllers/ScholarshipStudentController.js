const ScholarshipStudent = require("../models/ScholarshipStudent");

const scholarshipStudentController = {
  // Create Scholarship Student
  createScholarshipStudent: async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        country_of_studying,
        city,
        university,
        type_of_university,
        program_of_study,
        student_university_id,
        enrollment_year,
        expected_graduation_year,
      } = req.body;

      // Check if student university ID already exists for this user
      const existingStudent = await ScholarshipStudent.findOne({
        user: userId,
      });
      if (existingStudent) {
        return res.status(400).json({
          message:
            "Student university ID already exists for this user, please update the existing record instead.",
        });
      }

      const newScholarshipStudent = new ScholarshipStudent({
        user: userId,
        country_of_studying,
        city,
        university,
        type_of_university,
        program_of_study,
        student_university_id,
        enrollment_year,
        expected_graduation_year,
      });

      await newScholarshipStudent.save();
      res.status(201).json(newScholarshipStudent);
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation Error",
          error: error.message,
        });
      }
      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  },

  // Get All Scholarship Students for User
  getAllScholarshipStudents: async (req, res) => {
    try {
      const userId = req.user.id;
      const students = await ScholarshipStudent.find({ user: userId });
      res.json(students);
    } catch (error) {
      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  },

  // Get Single Scholarship Student
  getScholarshipStudentById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const student = await ScholarshipStudent.findOne({
        _id: id,
        user: userId,
      });

      if (!student) {
        return res.status(404).json({
          message: "Scholarship student not found",
        });
      }

      res.status(200).json({ message: "Data updated", student });
    } catch (error) {
      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  },

  // Update Scholarship Student
  updateScholarshipStudent: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const updatedStudent = await ScholarshipStudent.findByIdAndUpdate(
        { _id: id, user: userId },
        updates,
        { new: true, runValidators: true, context: "query" }
      );

      if (!updatedStudent) {
        return res.status(404).json({
          message: "Scholarship student not found",
        });
      }

      res.json(updatedStudent);
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation Error",
          error: error.message,
        });
      }
      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  },

  // Delete Scholarship Student
  deleteScholarshipStudent: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deletedStudent = await ScholarshipStudent.findOneAndDelete({
        _id: id,
        user: userId,
      });

      if (!deletedStudent) {
        return res.status(404).json({
          message: "Scholarship student not found",
        });
      }

      res.json({
        message: "Scholarship student deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  },
};

module.exports = scholarshipStudentController;
