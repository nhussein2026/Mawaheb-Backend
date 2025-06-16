const mongoose = require("mongoose");

const FinancialReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  financial_report_image: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date_of_report: { type: Date },
});

const FinancialReport = mongoose.model(
  "FinancialReport",
  FinancialReportSchema
);

module.exports = FinancialReport;
