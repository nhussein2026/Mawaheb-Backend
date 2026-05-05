const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  job_title: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  hire_date: { type: Date },
  bank_account_number: { type: String },
  social_security_number: { type: String },

});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
