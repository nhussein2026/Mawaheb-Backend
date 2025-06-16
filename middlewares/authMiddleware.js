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
    const user = await User.findOne({ _id: req.user.userId });
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
    const employee = await Employee.findOne({ user: req.user._id });
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

module.exports = { authenticated, isAdmin, isEmployee };
