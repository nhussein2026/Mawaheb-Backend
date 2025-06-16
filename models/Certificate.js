const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  certificate_image: { type: String },
  certificate_link: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Certificate = mongoose.model("Certificate", certificateSchema);

module.exports = Certificate;
