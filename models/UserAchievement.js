const mongoose = require("mongoose");

const userAchievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: [
      "Project",
      "Prize",
      "Certificate",
      "Innovation",
      "Research Paper",
      "Volunteering Activity",
      "Other",
    ],
  },
  achievement_image: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const UserAchievement = mongoose.model(
  "UserAchievement",
  userAchievementSchema
);

module.exports = UserAchievement;
