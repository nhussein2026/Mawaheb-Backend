const mongoose = require("mongoose");
const { INSTITUTE_ROLES } = require("../utils/instituteEnums");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  full_name_en: { type: String }, // English full name (used on certificates)
  bio: { type: String }, // نبذة / about
  username: { type: String }, // اسم المستخدم — immutable after creation (enforced in controller)
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
  // Institute Portal membership rank (بوابة المعهد). Kept separate from the
  // platform-level `role` so the two areas don't overload one field.
  instituteRole: {
    type: String,
    enum: [...INSTITUTE_ROLES, null],
    default: null,
  },
  // Last activity timestamp — powers compute-on-request "online now" presence
  // on the institute dashboard (no realtime infra; see plan §1/§9).
  lastSeenAt: { type: Date },
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
  requestedRole: {
    type: String,
    enum: [
      "User",
      "Employee",
      "Admin",
      "Institute Student",
      "Scholarship Student",
    ],
  },
  roleRequestStatus: {
    type: String,
    enum: ["None", "Pending", "Approved", "Rejected"],
    default: "None",
  },
  imageUrl: {
    type: String,
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
