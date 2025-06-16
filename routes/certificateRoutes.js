const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticated } = require('../middlewares/authMiddleware');

// Create a new certificate
router.post('/certificates', authenticated, certificateController.createCertificate);

// Get all certificates
router.get('/certificates', authenticated, certificateController.getCertificates);

// Get a certificate by ID
router.get('/certificates/:id', authenticated, certificateController.getCertificateById);

// Update a certificate by ID
router.put('/certificates/:id', authenticated, certificateController.updateCertificate);

// Delete a certificate by ID
router.delete('/certificates/:id', authenticated, certificateController.deleteCertificate);

module.exports = router;
