const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 8,
    maxlength: 255,
  },
  password: { type: String, required: true, minlength: 8, maxlength: 1024 },
  phone_number: { type: String },
  date_of_birth: { type: Date },
  gender: { type: String },
  current_education_level: { type: String },
  linkedin_link: { type: String },
  website: { type: String },
  role: {
    type: String,
    enum: [
      "User",
      "Employee",
      "Admin",
      "Institute Student",
      "Scholarship Student",
    ],
    default: "User",
  },
  imageUrl: {
    type: String,
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
