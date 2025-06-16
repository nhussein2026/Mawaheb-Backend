// controllers/statsController.js
const User = require("../models/User");

// @desc    Get general statistics for normal users
// @route   GET /api/stats/general
// @access  Public (or Private depending on your needs)
const getGeneralStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    // Add more general stats here as needed
    const generalStats = {
      total_users: totalUsers,
    };

    res.status(200).json(generalStats);
  } catch (error) {
    console.error("Error fetching general statistics:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get detailed statistics for admin
// @route   GET /api/stats/admin
// @access  Private/Admin
const getAdminStatistics = async (req, res) => {
  try {
    // Aggregate user statistics by role
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          users: {
            $push: {
              name: "$name",
              email: "$email",
              createdAt: "$_id.getTimestamp()",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          role: "$_id",
          count: 1,
          users: 1,
        },
      },
    ]);

    // Convert array to object with roles as keys
    const formattedStats = roleStats.reduce((acc, curr) => {
      acc[curr.role] = {
        count: curr.count,
        users: curr.users,
      };
      return acc;
    }, {});

    // Add additional admin-specific statistics here
    const adminStats = {
      user_statistics: formattedStats,
      total_users: await User.countDocuments(),
      // Add more aggregated stats as needed
    };

    res.status(200).json(adminStats);
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getGeneralStatistics,
  getAdminStatistics,
};
