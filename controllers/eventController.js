const Event = require("../models/Event");
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
}).single("photo"); // Accept a single file with the name 'photo'

const eventController = {
  createEvent: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description } = req.body;
        const userId = req.user.id; // Extract user ID from authenticated middleware

        const event = new Event({
          title,
          description,
          user: userId,
          photo: req.file ? req.file.path : undefined,
        });

        await event.save();
        res.status(201).json({ message: "Event created successfully", event });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  getEvents: async (req, res) => {
    try {
      const events = await Event.find({ user: req.user.id });
      res.status(200).json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getEventById: async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event || event.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(200).json(event);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateEvent: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event || event.user.toString() !== req.user.id.toString()) {
          return res.status(404).json({ message: "Event not found" });
        }

        event.title = title || event.title;
        event.description = description || event.description;
        if (req.file) {
          event.photo = req.file.path;
        }

        await event.save();
        res.status(200).json({ message: "Event updated successfully", event });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  deleteEvent: async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event || event.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: "Event not found" });
      }

      await event.deleteOne();
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = eventController;
