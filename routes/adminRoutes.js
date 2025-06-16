const express = require("express");
const { getAllUsers } = require("../controllers/userController");
const { authenticated, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// getting all users
router.get("/users", authenticated, isAdmin, getAllUsers);

module.exports = router;
