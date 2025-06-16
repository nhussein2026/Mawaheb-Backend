const express = require("express");
const {
  signup,
  login,
  adminLogin,
  forgetPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

// Route for user signup
router.post("/signup", signup);

// Route for user login
router.post("/login", login);

//Routes for resetting password
router.post("/forgot-Password", forgetPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
