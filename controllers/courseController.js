const Course = require("../models/Course");
const multer = require("multer");
const cloudinaryStorage = require("../utils/cloudinaryStorage"); // Adjust path as needed
const cloudinary = require("../config/cloudinary"); // Adjust path as needed

// Configure multer with Cloudinary storage
const upload = multer({
  storage: cloudinaryStorage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Images Only!"));
    }
  },
}).single("course_image"); // Accept a single file with the name 'course_image'

const courseController = {
  createCourse: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      try {
        const { title, description } = req.body;
        const userId = req.user.id; // Extract user ID from authenticated middleware

        const course = new Course({
          title,
          description,
          user: userId,
          course_image: req.file ? req.file.path : undefined, // Cloudinary URL
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
        return res.status(400).json({ message: err.message });
      }

      try {
        const { title, description } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course || course.user.toString() !== req.user.id.toString()) {
          return res.status(404).json({ message: "Course not found" });
        }

        // If updating with a new image, delete the old one from Cloudinary
        if (req.file && course.course_image) {
          try {
            // Extract public_id from the old image URL
            const publicId = course.course_image
              .split("/")
              .slice(-2)
              .join("/")
              .split(".")[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.error("Error deleting old image:", deleteError);
            // Continue with update even if deletion fails
          }
        }

        course.title = title || course.title;
        course.description = description || course.description;
        if (req.file) {
          course.course_image = req.file.path; // Cloudinary URL
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

      // Delete image from Cloudinary if it exists
      if (course.course_image) {
        try {
          // Extract public_id from the image URL
          const publicId = course.course_image
            .split("/")
            .slice(-2)
            .join("/")
            .split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting image from Cloudinary:", deleteError);
          // Continue with course deletion even if image deletion fails
        }
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
