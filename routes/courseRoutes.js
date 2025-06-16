const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new course
router.post('/courses', authenticated, courseController.createCourse);

// Get all courses
router.get('/courses', authenticated, courseController.getCourses);

// Get a course by ID
router.get('/courses/:id', authenticated, courseController.getCourseById);

// Update a course by ID
router.put('/courses/:id', authenticated, courseController.updateCourse);

// Delete a course by ID
router.delete('/courses/:id', authenticated, courseController.deleteCourse);

module.exports = router;
