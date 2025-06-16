const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    photo: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
