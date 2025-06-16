const Semester = require("../models/Semester");

const semesterController = {
  // CREATE a new semester
  createSemester: async (req, res) => {
    try {
      const { semesterNumber, courses, resultImage, semesterGPA, totalGPA } =
        req.body;
      const userId = req.user.id;

      // GPA Calculation
      // let totalCredits = 0;
      // let totalPoints = 0;

      // courses.forEach((course) => {
      //   totalCredits += course.credits;
      //   totalPoints += course.credits * course.grade;
      // });

      // const semesterGPA = totalCredits ? totalPoints / totalCredits : 0;

      const semester = new Semester({
        semesterNumber,
        courses,
        resultImage,
        semesterGPA,
        totalGPA,
        user: userId,
      });

      const savedSemester = await semester.save();
      res
        .status(201)
        .json({ message: "Semester created", semester: savedSemester });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // READ: Get all semesters of current user
  getAllSemesters: async (req, res) => {
    try {
      const semesters = await Semester.find({ user: req.user.id });
      res.status(200).json(semesters);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // READ: Get a single semester by ID
  getSemesterById: async (req, res) => {
    try {
      const semester = await Semester.findById(req.params.id);
      if (!semester) {
        return res.status(404).json({ message: "Semester not found" });
      }
      res.status(200).json(semester);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // UPDATE semester
  updateSemester: async (req, res) => {
    try {
      const { courses, semesterNumber, resultImage } = req.body;
      const userId = req.user.id;

      let semester = await Semester.findById(req.params.semesterId);
      if (!semester) {
        return res.status(404).json({ message: "Semester not found" });
      }

      // Only allow the owner to update
      if (semester.user.toString() !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update GPA if courses changed
      if (courses) {
        let totalCredits = 0;
        let totalPoints = 0;

        courses.forEach((course) => {
          totalCredits += course.credits;
          totalPoints += course.credits * course.grade;
        });

        semester.semesterGPA = totalCredits ? totalPoints / totalCredits : 0;
        semester.courses = courses;
      }

      if (semesterNumber !== undefined)
        semester.semesterNumber = semesterNumber;
      if (resultImage !== undefined) semester.resultImage = resultImage;

      await semester.save();
      res.status(200).json({ message: "Semester updated", semester });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // DELETE semester
  deleteSemester: async (req, res) => {
    try {
      const semester = await Semester.findById(req.params.id);
      if (!semester) {
        return res.status(404).json({ message: "Semester not found" });
      }

      // Remove from university
      const universities = await University.find({ semesters: semester._id });
      for (let uni of universities) {
        uni.semesters = uni.semesters.filter(
          (id) => id.toString() !== semester._id.toString()
        );

        // Recalculate university GPA
        let totalGPA = 0;
        for (let semId of uni.semesters) {
          const sem = await Semester.findById(semId);
          totalGPA += sem.semesterGPA;
        }
        uni.totalGPA = uni.semesters.length
          ? totalGPA / uni.semesters.length
          : 0;

        await uni.save();
      }

      await Semester.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Semester deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = semesterController;
