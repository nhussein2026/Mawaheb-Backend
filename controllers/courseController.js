const Course = require("../models/Course");
const multer = require("multer");
const path = require("path");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: Images Only!");
    }
  },
}).single("course_image"); // Accept a single file with the name 'course_image'

const courseController = {
  createCourse: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description } = req.body;
        const userId = req.user.id; // Extract user ID from authenticated middleware

        const course = new Course({
          title,
          description,
          user: userId,
          course_image: req.file ? req.file.path : undefined,
        });

        await course.save();
        res
          .status(201)
          .json({ message: "Course created successfully", course });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  getCourses: async (req, res) => {
    console.log("Fetching courses for user ID:", req.user.id);
    try {
      const courses = await Course.find({ user: req.user.id });
      res.status(200).json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getCourseById: async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course || course.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.status(200).json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateCourse: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course || course.user.toString() !== req.user.id.toString()) {
          return res.status(404).json({ message: "Course not found" });
        }

        course.title = title || course.title;
        course.description = description || course.description;
        if (req.file) {
          course.course_image = req.file.path;
        }

        await course.save();
        res
          .status(200)
          .json({ message: "Course updated successfully", course });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  deleteCourse: async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course || course.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: "Course not found" });
      }

      await course.deleteOne();
      res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = courseController;
