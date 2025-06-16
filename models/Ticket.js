const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Student who opens the ticket
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee or Admin assigned to the ticket
    title: { type: String, required: true },
    description: { type: String, required: true },
    response: { type: String }, // Response from the admin/employee
    status: { 
        type: String, 
        enum: ['Open', 'In Progress', 'Resolved', 'Closed'], 
        default: 'Open' 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to automatically update the updatedAt field before saving
ticketSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
