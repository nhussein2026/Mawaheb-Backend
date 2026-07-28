const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");

const authenticated = (req, res, next) => {
  const authHeader = req.header("authorization");
  const token = authHeader && authHeader.split(" ")[1];
  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id });

    if (!user || user.role !== "Admin")
      return res.status(403).json({ message: "Access denied: Not an admin" });
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const isEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });

    if (!employee)
      return res
        .status(403)
        .json({ message: "Access denied: Not an employee" });
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const isAdminOrEmployee = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== "Admin" && user.role !== "Employee")) {
      return res.status(403).json({ message: "Access denied: Not an admin or employee" });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const {
  INSTITUTE_ADMIN_ROLES,
  INSTITUTE_STAFF_ROLES,
} = require("../utils/instituteEnums");

// Institute portal admin: platform Admin OR a super/track supervisor.
const isInstituteAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (
      !user ||
      (user.role !== "Admin" && !INSTITUTE_ADMIN_ROLES.includes(user.instituteRole))
    ) {
      return res
        .status(403)
        .json({ message: "Access denied: Not an institute admin" });
    }
    req.instituteUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Any institute staff (non-student) OR platform Admin.
const isInstituteStaff = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (
      !user ||
      (user.role !== "Admin" && !INSTITUTE_STAFF_ROLES.includes(user.instituteRole))
    ) {
      return res
        .status(403)
        .json({ message: "Access denied: Not institute staff" });
    }
    req.instituteUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logged-in institute student (student-facing endpoints). Accepts either the
// institute rank `student` or the platform role "Institute Student" (accounts
// created before the two-field split carry only the latter).
const isInstituteStudent = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (
      !user ||
      (user.instituteRole !== "student" && user.role !== "Institute Student")
    ) {
      return res
        .status(403)
        .json({ message: "Access denied: Not an institute student" });
    }
    req.instituteUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Factory: require one of the given institute ranks (platform Admin always
// passes). Use for per-module guards, e.g. hasInstituteRole("trainer").
const hasInstituteRole = (...ranks) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (
      !user ||
      (user.role !== "Admin" && !ranks.includes(user.instituteRole))
    ) {
      return res
        .status(403)
        .json({ message: "Access denied: insufficient institute role" });
    }
    req.instituteUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Guardian read-only session (spec §6.15). The token is minted by the guardian
// login (academic number + guardian PIN) and carries a `guardian` claim scoped
// to one student. It deliberately has no `user` claim, so it can never be used
// as a normal user token on `authenticated` routes.
const guardianAuth = (req, res, next) => {
  const authHeader = req.header("authorization");
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded.guardian) {
      return res.status(401).json({ message: "Invalid guardian token" });
    }
    req.guardian = decoded.guardian;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = {
  authenticated,
  isAdmin,
  isEmployee,
  isAdminOrEmployee,
  isInstituteAdmin,
  isInstituteStaff,
  isInstituteStudent,
  hasInstituteRole,
  guardianAuth,
};
