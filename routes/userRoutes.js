const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticated } = require("../middlewares/authMiddleware");
const multer = require("multer");
const storage = require("../utils/cloudinary");
const upload = multer({ storage });

// Get all users
router.get("/users", authenticated, userController.fetchAllUsers);

// summary of user data
router.get(
  "/summary/",
  authenticated,
  userController.fetchUsersSummaryByCategory
);

// Get a user by ID
router.get("/users/:id", authenticated, userController.fetchUserById);

// Update a user by ID
router.put(
  "/update-profile",
  authenticated,
  upload.single("profileImage"),
  userController.updateUser
);

// Delete a user by ID
router.delete("/users/:id", authenticated, userController.deleteUser);

//user profile endpoint
router.get("/profile", authenticated, userController.fetchUserProfile);

// Role Request Routes
router.post("/role-request", authenticated, userController.submitRoleRequest);
router.get("/admin/role-requests", authenticated, userController.getPendingRoleRequests);
router.put("/admin/role-requests/:userId", authenticated, userController.handleRoleRequest);

// Ticket Routes
router.get("/ticket", authenticated, userController.getUserTickets);
router.post("/ticket", authenticated, userController.createTicket);

module.exports = router;
