// routes/statsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getGeneralStatistics,
  getAdminStatistics,
} = require("../controllers/statsController");
const { authenticated, isAdmin } = require("../middlewares/authMiddleware");

router.get("/general", authenticated, getGeneralStatistics);
router.get("/admin", authenticated, isAdmin, getAdminStatistics);

module.exports = router;
