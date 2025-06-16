const FinancialReport = require("../models/FinancialReport");
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
}).single("financial_report_image"); // Accept a single file with the name 'course_image'

const financialReportController = {
  createFinancialReport: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description, date_of_report } = req.body;
        const userId = req.user.id; // Extract user ID from authenticated middleware

        const financialReport = new FinancialReport({
          title,
          description,
          user: userId,
          financial_report_image: req.file ? req.file.path : undefined,
          date_of_report,
        });

        await financialReport.save();
        res.status(201).json({
          message: "Financial Report created successfully",
          financialReport,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  getReport: async (req, res) => {
    try {
      const report = await FinancialReport.find({ user: req.user.id });
      res.status(200).json(report);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getReportById: async (req, res) => {
    try {
      const report = await FinancialReport.findById(req.params.id);
      if (!report || report.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: "report not found" });
      }
      res.status(200).json(report);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateFinancialReport: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      try {
        const { title, description, date_of_report } = req.body;
        const report = await FinancialReport.findById(req.params.id);

        if (!report || report.user.toString() !== req.user.id.toString()) {
          return res.status(404).json({ message: "report not found" });
        }

        report.title = title || report.title;
        report.description = description || report.description;
        if (req.file) {
          report.financial_report_image = req.file.path;
        }

        await report.save();
        res
          .status(200)
          .json({ message: "report updated successfully", report });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });
  },

  deleteFinancialReport: async (req, res) => {
    try {
      const report = await FinancialReport.findById(req.params.id);

      if (!report || report.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: "report not found" });
      }

      await report.deleteOne();
      res.status(200).json({ message: "report deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = financialReportController;
