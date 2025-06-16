const Certificate = require("../models/Certificate");
const multer = require("multer");
const path = require("path");

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // File name
  },
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).single("certificate_image"); // Expect a single file with field name 'certificate_image'

const certificateController = {
  createCertificate: (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      const { title, description, certificate_link } = req.body;
      const certificate_image = req.file ? req.file.filename : null;
      const userId = req.user.id; // Extract user ID from authenticated middleware

      try {
        const certificate = new Certificate({
          title,
          description,
          certificate_image,
          certificate_link,
          user: userId,
        });
        await certificate.save();
        res
          .status(201)
          .json({ message: "Certificate created successfully", certificate });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  getCertificates: async (req, res) => {
    try {
      const userId = req.user.id;
      // If you want to filter certificates by user, uncomment the line below
      const certificates = await Certificate.find({ user: userId }).sort({
        createdAt: -1,
      });
      res.json(certificates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getCertificateById: async (req, res) => {
    try {
      const certificate = await Certificate.findById(req.params.id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateCertificate: (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      const { title, description, certificate_link } = req.body;
      const certificate_image = req.file ? req.file.filename : null;

      try {
        const updateData = { title, description, certificate_link };
        if (certificate_image) updateData.certificate_image = certificate_image;

        const updatedCertificate = await Certificate.findByIdAndUpdate(
          req.params.id,
          updateData,
          { new: true }
        );
        if (!updatedCertificate) {
          return res.status(404).json({ message: "Certificate not found" });
        }
        res.json({
          message: "Certificate updated successfully",
          updatedCertificate,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  deleteCertificate: async (req, res) => {
    try {
      const deletedCertificate = await Certificate.findByIdAndDelete(
        req.params.id
      );
      if (!deletedCertificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json({ message: "Certificate deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = certificateController;
