const UserAchievement = require("../models/UserAchievement");
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
}).single("achievement_image"); // Accept a single file with the name 'achievement_image'

const userAchievementController = {
  createUserAchievement: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description, category } = req.body;
        const user = req.user.id;
        const userAchievement = new UserAchievement({
          title,
          description,
          category,
          user,
          achievement_image: req.file ? req.file.path : undefined,
        });
        await userAchievement.save();
        res.status(201).json({
          message: "User Achievement created successfully",
          userAchievement,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  getUserAchievements: async (req, res) => {
    try {
      const userAchievements = await UserAchievement.find({
        user: req.user.id,
      });
      res.status(200).json(userAchievements);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getUserAchievementById: async (req, res) => {
    try {
      const userAchievement = await UserAchievement.findById(req.params.id);
      if (
        !userAchievement ||
        userAchievement.userId.toString() !== req.user._id.toString()
      ) {
        return res.status(404).json({ message: "User Achievement not found" });
      }
      res.status(200).json(userAchievement);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateUserAchievement: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description, category } = req.body;
        const userAchievement = await UserAchievement.findById(req.params.id);

        if (
          !userAchievement ||
          userAchievement.userId.toString() !== req.user.id.toString()
        ) {
          return res
            .status(404)
            .json({ message: "User Achievement not found" });
        }

        userAchievement.title = title || userAchievement.title;
        userAchievement.description =
          description || userAchievement.description;
        userAchievement.category = category || userAchievement.category;
        if (req.file) {
          userAchievement.achievement_image = req.file.path;
        }

        await userAchievement.save();
        res.status(200).json({
          message: "User Achievement updated successfully",
          userAchievement,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  deleteUserAchievement: async (req, res) => {
    try {
      const userAchievement = await UserAchievement.findById(req.params.id);

      if (
        !userAchievement ||
        userAchievement.userId.toString() !== req.user.id.toString()
      ) {
        return res.status(404).json({ message: "User Achievement not found" });
      }

      await userAchievement.deleteOne();
      res
        .status(200)
        .json({ message: "User Achievement deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = userAchievementController;
