const mongoose = require("mongoose");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const Certificate = require("../models/Certificate");
const Course = require("../models/Course");
const Event = require("../models/Event");
const Achievement = require("../models/UserAchievement");
const ScholarshipStudent = require("../models/ScholarshipStudent");
const Employee = require("../models/Employee");
const InstituteStudent = require("../models/InstituteStudent");
const FinancialReport = require("../models/FinancialReport");
const Note = require("../models/Note");
const Semester = require("../models/Semester");
const Ticket = require("../models/Ticket");
const StudentReport = require("../models/StudentReport");

// Update User Info
exports.updateUser = [
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      bio,
      phone_number,
      date_of_birth,
      gender,
      current_education_level,
      linkedin_link,
      website,
      role,
    } = req.body;

    try {
      let user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      // Only allow admin to update role
      if (role && req.user.role !== "Admin") {
        return res.status(403).json({ msg: "Only admin can update role" });
      }

      // Update user details
      user.name = name || user.name;
      user.email = email || user.email;
      user.password = password || user.password;
      user.bio = bio || user.bio;
      user.phone_number = phone_number || user.phone_number;
      user.date_of_birth = date_of_birth || user.date_of_birth;
      user.gender = gender || user.gender;
      user.current_education_level =
        current_education_level || user.current_education_level;
      user.linkedin_link = linkedin_link || user.linkedin_link;
      user.website = website || user.website;
      user.role = role || user.role;

      // If a new profile image is uploaded, update the imageUrl
      if (req.file) {
        user.imageUrl = req.file.path.replace(/\\/g, "/"); // Replace backslashes with forward slashes
      }

      await user.save();

      res.json({ msg: "User updated successfully", user });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server error");
    }
  },
];

// Delete User (Admin Only)
exports.deleteUser = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  try {
    const user = await User.findById(req.params.id);
    console.log("user id: ", user);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await user.deleteOne();

    res.json({ msg: "User deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Fetch User Profile
exports.fetchUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    // Check if req.user is defined
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user information found" });
    }

    const user = await User.findById(userId); // Fetch user profile based on token
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Fetch statistics
    const [
      certificates,
      courses,
      events,
      achievements,
      financialReports,
      notes,
      semesters,
      tickets,
      studentReports,
    ] = await Promise.all([
      Certificate.countDocuments({ user: userId }),
      Course.countDocuments({ user: userId }),
      Event.countDocuments({ user: userId }),
      Achievement.countDocuments({ user: userId }),
      FinancialReport.countDocuments({ user: userId }),
      Note.countDocuments({ user: userId }),
      Semester.countDocuments({ user: userId }),
      Ticket.countDocuments({ user: userId }),
      StudentReport.countDocuments({ user: userId }),
    ]);

    const statistics = {
      certificates,
      courses,
      events,
      financialReports,
      notes,
      semesters,
      tickets,
      studentReports,
      achievements,
    };

    // Customize response based on role
    let profileData = { user };

    if (user.role === "Admin") {
      // Admin-specific data (you can add more details here if needed)
      profileData = { user, statistics };
    } else if (user.role === "Employee") {
      // Fetch employee-specific data
      const employeeProfile = await Employee.findOne({ user: userId });
      profileData = { user, employeeProfile };
    } else if (user.role === "Institute Student") {
      // Fetch institute student-specific data
      const instituteStudentProfile = await InstituteStudent.findOne({
        user: userId,
      });
      profileData = { user, instituteStudentProfile };
    } else if (user.role === "Scholarship Student") {
      // Fetch scholarship student-specific data
      const scholarshipStudentProfile = await ScholarshipStudent.findOne({
        user: userId,
      });
      profileData = { user, statistics, scholarshipStudentProfile };
    }
    // Send the response
    res.status(200).json(profileData);
  } catch (error) {
    res
      .status(401)
      .json({ error: "Ooops!!, error occurred while fetching profile data!!" });
  }
};

exports.fetchAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Fetch User Role
exports.fetchUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ role: user.role });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Fetch User by ID
exports.fetchUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Fetch All Users with Summary Information Based on Category

// Fetch Users Summary by Category
exports.fetchUsersSummaryByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    let result = [];

    switch (category) {
      case "courses":
        result = await User.aggregate([
          {
            $lookup: {
              from: "courses",
              localField: "_id",
              foreignField: "user",
              as: "courses",
            },
          },
          {
            $project: {
              id: 1,
              name: 1,
              email: 1,
              courses: 1,
              courseCount: { $size: "$courses" }, // Count of courses enrolled
            },
          },
        ]);
        break;
      case "certificates":
        result = await User.aggregate([
          {
            $lookup: {
              from: "certificates",
              localField: "_id",
              foreignField: "user",
              as: "certificates",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              certificates: 1,
              certificateCount: { $size: "$certificates" }, // Count of certificates
            },
          },
        ]);
        break;
      case "difficulties":
        result = await User.aggregate([
          {
            $lookup: {
              from: "difficulties",
              localField: "_id",
              foreignField: "user",
              as: "difficulties",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              difficulties: 1,
              difficultyCount: { $size: "$difficulties" }, // Count of difficulties reported
            },
          },
        ]);
        break;
      case "events":
        result = await User.aggregate([
          {
            $lookup: {
              from: "events",
              localField: "_id",
              foreignField: "user",
              as: "events",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              events: 1,
              eventCount: { $size: "$events" }, // Count of events participated
            },
          },
        ]);
        break;
      case "financialReports":
        result = await User.aggregate([
          {
            $lookup: {
              from: "financialreports",
              localField: "_id",
              foreignField: "user",
              as: "financialReports",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              financialReports: 1,
              financialReportCount: { $size: "$financialReports" }, // Count of financial reports
            },
          },
        ]);
        break;
      case "semesters":
        result = await University.aggregate([
          {
            $lookup: {
              from: "semesters",
              localField: "user",
              foreignField: "_id",
              as: "Semesters",
            },
          },
          {
            $project: {
              _id: 1,
              universityName: 1,
              universityType: 1,
              semesters: 1,
              semesterCount: { $size: "$Semesters" }, // Count of semesters attended
            },
          },
        ]);
        break;
      case "reports":
        result = await User.aggregate([
          {
            $lookup: {
              from: "studentreports",
              localField: "_id",
              foreignField: "user",
              as: "reports",
              pipeline: [
                {
                  $lookup: {
                    from: "courses",
                    localField: "courseId",
                    foreignField: "_id",
                    as: "courseId",
                  },
                },
                {
                  $unwind: {
                    path: "$courseId",
                    preserveNullAndEmptyArrays: true,
                  },
                },

                {
                  $lookup: {
                    from: "notes",
                    localField: "noteId",
                    foreignField: "_id",
                    as: "noteId",
                  },
                },
                {
                  $unwind: {
                    path: "$noteId",
                    preserveNullAndEmptyArrays: true,
                  },
                },

                {
                  $lookup: {
                    from: "difficulties",
                    localField: "difficultyId",
                    foreignField: "_id",
                    as: "difficultyId",
                  },
                },
                {
                  $unwind: {
                    path: "$difficultyId",
                    preserveNullAndEmptyArrays: true,
                  },
                },

                {
                  $lookup: {
                    from: "userachievements",
                    localField: "userAchievementId",
                    foreignField: "_id",
                    as: "userAchievementId",
                  },
                },
                {
                  $unwind: {
                    path: "$userAchievementId",
                    preserveNullAndEmptyArrays: true,
                  },
                },

                {
                  $lookup: {
                    from: "events",
                    localField: "eventId",
                    foreignField: "_id",
                    as: "eventId",
                  },
                },
                {
                  $unwind: {
                    path: "$eventId",
                    preserveNullAndEmptyArrays: true,
                  },
                },

                {
                  $lookup: {
                    from: "certificates",
                    localField: "certificateId",
                    foreignField: "_id",
                    as: "certificateId",
                  },
                },
                {
                  $unwind: {
                    path: "$certificateId",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              reports: 1,
              reportCount: { $size: "$reports" }, // Count of reports submitted
            },
          },
        ]);
        break;
      case "tickets":
        result = await User.aggregate([
          {
            $lookup: {
              from: "Ticket",
              localField: "_id",
              foreignField: "user",
              as: "Tickets",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              ticketCount: { $size: "$Tickets" }, // Count of tickets raised
            },
          },
        ]);
        break;
      case "userAchievements":
        result = await User.aggregate([
          {
            $lookup: {
              from: "userachievements",
              localField: "_id",
              foreignField: "user",
              as: "achievements",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              achievements: 1,
              achievementCount: { $size: "$achievements" }, // Count of achievements
            },
          },
        ]);
        break;
      default:
        return res.status(400).json({ message: "Invalid category" });
    }

    res.json({ result });
    console.log("Users Summary by Category:", result);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Admin getting all users
exports.getAllUsers = async (req, res) => {
  try {
    // Verify admin privileges
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can access this endpoint",
      });
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get sorting parameters
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    // Build filter object
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get paginated and sorted users
    const users = await User.find(filter)
      .select("-password -__v")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
