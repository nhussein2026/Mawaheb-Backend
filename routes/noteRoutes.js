const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new note
router.post('/notes', authenticated, noteController.createNote);

// Get all notes for the authenticated user
router.get('/notes', authenticated, noteController.getNotes);

// Get a specific note by ID
router.get('/notes/:id', authenticated, noteController.getNoteById);

// Update a note by ID
router.put('/notes/:id', authenticated, noteController.updateNote);

// Delete a note by ID
router.delete('/notes/:id', authenticated, noteController.deleteNote);

module.exports = router;
