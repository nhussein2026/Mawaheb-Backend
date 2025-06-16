const mongoose = require("mongoose");

const difficultySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Difficulty = mongoose.model('Difficulty', difficultySchema);

module.exports = Difficulty;
