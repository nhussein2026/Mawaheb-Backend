const mongoose = require('mongoose');

const instituteStudentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    education_level: { type: String, required: true },
    talent: { type: String, required: true },
    parent_phone: { type: String, required: true }
});

const InstituteStudent = mongoose.model('InstituteStudent', instituteStudentSchema);

module.exports = InstituteStudent;
