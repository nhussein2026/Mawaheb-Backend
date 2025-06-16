const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  job_title: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
