const express = require('express');
const router = express.Router();
const userAchievementController = require('../controllers/userAchievementController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new user achievement
router.post('/userAchievements', authenticated, userAchievementController.createUserAchievement);

// Get all user achievements for the authenticated user
router.get('/userAchievements', authenticated, userAchievementController.getUserAchievements);

// Get a single user achievement by ID
router.get('/userAchievements/:id', authenticated, userAchievementController.getUserAchievementById);

// Update a user achievement by ID
router.put('/userAchievements/:id', authenticated, userAchievementController.updateUserAchievement);

// Delete a user achievement by ID
router.delete('/userAchievements/:id', authenticated, userAchievementController.deleteUserAchievement);

module.exports = router;
