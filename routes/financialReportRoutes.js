const express = require('express');
const router = express.Router();
const financialReportController = require('../controllers/financialReportController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new event
router.post('/financial-report', authenticated, financialReportController.createFinancialReport);

// Get all financial-report for the logged-in user
router.get('/financial-report', authenticated, financialReportController.getReport);

// Get a specific event by ID
router.get('/financial-report/:id', authenticated, financialReportController.getReportById);

// Update a specific event by ID
router.put('/financial-report/:id', authenticated, financialReportController.updateFinancialReport);

// Delete a specific event by ID
router.delete('/financial-report/:id', authenticated, financialReportController.deleteFinancialReport);

module.exports = router;
