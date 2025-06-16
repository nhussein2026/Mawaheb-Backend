const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new event
router.post('/events', authenticated, eventController.createEvent);

// Get all events for the logged-in user
router.get('/events', authenticated, eventController.getEvents);

// Get a specific event by ID
router.get('/events/:id', authenticated, eventController.getEventById);

// Update a specific event by ID
router.put('/events/:id', authenticated, eventController.updateEvent);

// Delete a specific event by ID
router.delete('/events/:id', authenticated, eventController.deleteEvent);

module.exports = router;
