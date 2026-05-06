const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { authenticated, isAdminOrEmployee } = require("../middlewares/authMiddleware");

// @route   POST /tickets
// @desc    Create a ticket
router.post("/", authenticated, ticketController.createTicket);

// @route   GET /tickets/my
// @desc    Get tickets for current user
router.get("/my", authenticated, ticketController.getMyTickets);

// @route   GET /tickets
// @desc    Get all tickets (Admin/Employee only)
router.get("/", authenticated, isAdminOrEmployee, ticketController.getAllTickets);

// @route   GET /tickets/:id
// @desc    Get ticket by ID
router.get("/:id", authenticated, ticketController.getTicketById);

// @route   PUT /tickets/:id
// @desc    Update ticket (Admin/Employee only)
router.put("/:id", authenticated, isAdminOrEmployee, ticketController.updateTicket);

// @route   DELETE /tickets/:id
// @desc    Delete ticket
router.delete("/:id", authenticated, ticketController.deleteTicket);

module.exports = router;
