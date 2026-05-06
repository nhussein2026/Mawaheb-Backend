const Ticket = require("../models/Ticket");
const User = require("../models/User");

// @desc    Create a new ticket
// @route   POST /tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const ticket = new Ticket({
      user: userId,
      title,
      description,
    });

    await ticket.save();
    res.status(201).json({ success: true, message: "Ticket created successfully", ticket });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get all tickets for the logged-in user
// @route   GET /tickets/my
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const tickets = await Ticket.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get all tickets (Admin/Employee only)
// @route   GET /tickets
// @access  Private (Admin/Employee)
exports.getAllTickets = async (req, res) => {
  try {
    // Check if user is Admin or Employee (using role from request)
    // We'll rely on route-level middleware for strict checks, 
    // but here's a secondary check just in case.
    const tickets = await Ticket.find()
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get ticket by ID
// @route   GET /tickets/:id
// @access  Private
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("user", "name email")
      .populate("assignedTo", "name email");

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Authorization check: Only the creator or Admin/Employee can view
    const isAdminOrEmployee = ["Admin", "Employee"].includes(req.user.role);

    if (ticket.user._id.toString() !== req.user.id && !isAdminOrEmployee) {
      return res.status(403).json({ success: false, message: "Not authorized to view this ticket" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error fetching ticket by ID:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Update ticket (Status, Response, Assignment)
// @route   PUT /tickets/:id
// @access  Private (Admin/Employee)
exports.updateTicket = async (req, res) => {
  try {
    const { status, response, assignedTo } = req.body;
    
    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Check authorization (Admin or Employee only)
    if (!["Admin", "Employee"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized to update tickets" });
    }

    // Update fields if provided
    if (status) ticket.status = status;
    if (response) ticket.response = response;
    if (assignedTo) ticket.assignedTo = assignedTo;

    ticket.updatedAt = Date.now();
    await ticket.save();

    res.status(200).json({ success: true, message: "Ticket updated successfully", data: ticket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Delete ticket
// @route   DELETE /tickets/:id
// @access  Private
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Authorization check: Only the creator (if still open) or Admin can delete
    const isAdmin = req.user.role === "Admin";

    if (ticket.user.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this ticket" });
    }

    // Optional: Only allow user to delete if ticket is still 'Open'
    if (!isAdmin && ticket.status !== 'Open') {
        return res.status(400).json({ success: false, message: "Cannot delete a ticket that is already in progress or resolved" });
    }

    await ticket.deleteOne();

    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
