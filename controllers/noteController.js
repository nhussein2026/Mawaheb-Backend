const Note = require("../models/Note");

const noteController = {
  createNote: async (req, res) => {
    try {
      const { title, content } = req.body;
      const userId = req.user.id;
      const note = new Note({
        title,
        content,
        user: userId,
      });
      await note.save();
      res.status(201).json({ message: "Note created successfully", note });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getNotes: async (req, res) => {
    try {
      const notes = await Note.find({ user: req.user.id });
      res.json(notes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getNoteById: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      if (note.user.toString() !== req.user._id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(note);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateNote: async (req, res) => {
    try {
      const { title, content } = req.body;
      const note = await Note.findById(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      if (note.user.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      note.title = title || note.title;
      note.content = content || note.content;
      await note.save();

      res.json({ message: "Note updated successfully", note });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  deleteNote: async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      if (note.user.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await Note.deleteOne();
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = noteController;
