// controllers/employeeController.js
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Create a new employee record
// @route   POST /api/employees
// @access  Private/Admin (adjust as needed)
const createEmployee = async (req, res) => {
    try {
        const { job_title, user, hire_date, bank_account_number, social_security_number } = req.body;

        // Check required fields
        if (!job_title || !user) {
            return res.status(400).json({ message: "job_title and user are required" });
        }

        // Validate user exists
        if (!isValidObjectId(user)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }
        const existingUser = await User.findById(user);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Optional: prevent duplicate employee for same user
        const existingEmployee = await Employee.findOne({ user });
        if (existingEmployee) {
            return res.status(409).json({ message: "Employee record already exists for this user" });
        }

        const employee = new Employee({
            job_title,
            user,
            hire_date: hire_date || Date.now(),
            bank_account_number,
            social_security_number,
        });

        const savedEmployee = await employee.save();
        // Optionally update User role to "Employee" if not already
        if (existingUser.role !== "Employee") {
            existingUser.role = "Employee";
            await existingUser.save();
        }

        res.status(201).json(savedEmployee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get all employees with pagination, filtering, and population
// @route   GET /api/employees
// @access  Private/Admin
const getAllEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, job_title, user, min_hire_date, max_hire_date } = req.query;

        // Build filter object
        const filter = {};
        if (job_title) filter.job_title = { $regex: job_title, $options: "i" };
        if (user && isValidObjectId(user)) filter.user = user;
        if (min_hire_date || max_hire_date) {
            filter.hire_date = {};
            if (min_hire_date) filter.hire_date.$gte = new Date(min_hire_date);
            if (max_hire_date) filter.hire_date.$lte = new Date(max_hire_date);
        }

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { hire_date: -1 },
            populate: { path: "user", select: "name email phone_number role" },
        };

        const employees = await Employee.find(filter)
            .limit(options.limit)
            .skip((options.page - 1) * options.limit)
            .sort(options.sort)
            .populate(options.populate.path, options.populate.select);

        const total = await Employee.countDocuments(filter);

        res.status(200).json({
            total,
            page: options.page,
            pages: Math.ceil(total / options.limit),
            employees,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get employee by ID (populates user)
// @route   GET /api/employees/:id
// @access  Private/Admin
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid employee ID format" });
        }

        const employee = await Employee.findById(id).populate("user", "name email phone_number role date_of_birth");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        res.status(200).json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get employee by user ID
// @route   GET /api/employees/user/:userId
// @access  Private/Admin
const getEmployeeByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        const employee = await Employee.findOne({ user: userId }).populate("user", "name email phone_number role");

        if (!employee) {
            return res.status(404).json({ message: "No employee record found for this user" });
        }

        res.status(200).json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update employee record (partial update)
// @route   PUT /api/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid employee ID format" });
        }

        // Prevent changing the user reference unintentionally (optional)
        if (updates.user && !isValidObjectId(updates.user)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        if (updates.user) {
            const userExists = await User.findById(updates.user);
            if (!userExists) {
                return res.status(404).json({ message: "New user reference not found" });
            }
        }

        const employee = await Employee.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        }).populate("user", "name email");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        res.status(200).json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Delete employee record
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid employee ID format" });
        }

        const employee = await Employee.findByIdAndDelete(id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Optionally revert the associated user role if no other employee records exist for that user
        // (In case of one-to-one relationship, we can reset role, but be careful if user has multiple roles)
        const user = await User.findById(employee.user);
        if (user && user.role === "Employee") {
            user.role = "User";
            await user.save();
        }

        res.status(200).json({ message: "Employee record deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    getEmployeeByUserId,
    updateEmployee,
    deleteEmployee,
};