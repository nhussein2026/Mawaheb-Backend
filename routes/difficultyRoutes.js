const express = require('express');
const router = express.Router();
const difficultyController = require('../controllers/difficultyController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new difficulty
router.post('/difficulties', authenticated, difficultyController.createDifficulty);

// Get all difficulties for the logged-in user
router.get('/difficulties', authenticated, difficultyController.getDifficulties);

// Get a specific difficulty by ID
router.get('/difficulties/:id', authenticated, difficultyController.getDifficultyById);

// Update a specific difficulty by ID
router.put('/difficulties/:id', authenticated, difficultyController.updateDifficulty);

// Delete a specific difficulty by ID
router.delete('/difficulties/:id', authenticated, difficultyController.deleteDifficulty);

module.exports = router;
