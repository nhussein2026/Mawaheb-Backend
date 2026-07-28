// Support tickets — now backed by the unified Thread model (category
// "support") + ThreadMessage, while keeping the exact legacy /tickets API
// contract so the existing ticket UI is unchanged (plan §7). The single
// legacy `response` field is represented as one ThreadMessage; status is
// mapped between the old casing and the Thread's machine keys.
const Thread = require("../models/Thread");
const ThreadMessage = require("../models/ThreadMessage");

const OLD_TO_SUPPORT = {
  Open: "open",
  "In Progress": "in_progress",
  Resolved: "resolved",
  Closed: "closed",
};
const SUPPORT_TO_OLD = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

// Thread → legacy Ticket shape the frontend expects.
const toTicket = (thread, responseText = "") => ({
  _id: thread._id,
  title: thread.subject,
  description: thread.body,
  status: SUPPORT_TO_OLD[thread.status] || "Open",
  response: responseText || "",
  user: thread.author,
  assignedTo: thread.assignedTo || null,
  createdAt: thread.createdAt,
  updatedAt: thread.updatedAt,
});

// Latest reply body per thread id (the legacy single `response`).
async function latestResponses(threadIds) {
  const msgs = await ThreadMessage.find({ thread: { $in: threadIds } })
    .sort({ createdAt: 1 })
    .lean();
  const map = {};
  msgs.forEach((m) => {
    map[String(m.thread)] = m.body; // ascending sort → last write wins
  });
  return map;
}

// @route POST /tickets
exports.createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }
    const thread = await Thread.create({
      category: "support",
      subject: title,
      body: description,
      author: req.user.id,
      status: "open",
      lastMessageAt: new Date(),
      lastMessageBy: req.user.id,
    });
    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket: toTicket(thread, ""),
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @route GET /tickets/my
exports.getMyTickets = async (req, res) => {
  try {
    const threads = await Thread.find({
      category: "support",
      author: req.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();
    const map = await latestResponses(threads.map((t) => t._id));
    res.status(200).json({
      success: true,
      data: threads.map((t) => toTicket(t, map[String(t._id)])),
    });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @route GET /tickets  (Admin/Employee)
exports.getAllTickets = async (req, res) => {
  try {
    const threads = await Thread.find({ category: "support" })
      .populate("author", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .lean();
    const map = await latestResponses(threads.map((t) => t._id));
    const data = threads.map((t) => toTicket(t, map[String(t._id)]));
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @route GET /tickets/:id
exports.getTicketById = async (req, res) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.id,
      category: "support",
    })
      .populate("author", "name email")
      .populate("assignedTo", "name email")
      .lean();
    if (!thread) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    const isAdminOrEmployee = ["Admin", "Employee"].includes(req.user.role);
    const ownerId = String(thread.author?._id || thread.author);
    if (ownerId !== req.user.id && !isAdminOrEmployee) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to view this ticket" });
    }

    const map = await latestResponses([thread._id]);
    res.status(200).json({ success: true, data: toTicket(thread, map[String(thread._id)]) });
  } catch (error) {
    console.error("Error fetching ticket by ID:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @route PUT /tickets/:id  (Admin/Employee) — status / response / assignment
exports.updateTicket = async (req, res) => {
  try {
    const { status, response, assignedTo } = req.body;

    const thread = await Thread.findOne({
      _id: req.params.id,
      category: "support",
    });
    if (!thread) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    if (!["Admin", "Employee"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to update tickets" });
    }

    if (status) {
      const mapped = OLD_TO_SUPPORT[status] || status;
      thread.status = mapped;
    }
    if (assignedTo) thread.assignedTo = assignedTo;

    // Single-response semantics: keep exactly one reply message, editing it in
    // place so repeated saves don't stack duplicate replies.
    let responseText;
    if (response !== undefined) {
      let msg = await ThreadMessage.findOne({ thread: thread._id }).sort({
        createdAt: -1,
      });
      if (msg) {
        msg.body = response;
        await msg.save();
      } else {
        msg = await ThreadMessage.create({
          thread: thread._id,
          author: req.user.id,
          body: response,
        });
      }
      thread.lastMessageAt = new Date();
      thread.lastMessageBy = req.user.id;
      responseText = response;
    }

    await thread.save();

    if (responseText === undefined) {
      const map = await latestResponses([thread._id]);
      responseText = map[String(thread._id)];
    }
    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: toTicket(thread, responseText),
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @route DELETE /tickets/:id
exports.deleteTicket = async (req, res) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.id,
      category: "support",
    });
    if (!thread) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    const isAdmin = req.user.role === "Admin";
    if (String(thread.author) !== req.user.id && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete this ticket" });
    }
    if (!isAdmin && thread.status !== "open") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a ticket that is already in progress or resolved",
      });
    }

    await ThreadMessage.deleteMany({ thread: thread._id });
    await thread.deleteOne();

    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
