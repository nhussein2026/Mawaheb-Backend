// routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    getEmployeeByUserId,
    updateEmployee,
    deleteEmployee,
} = require("../controllers/employeeController");

router.post("/", createEmployee);
router.get("/", getAllEmployees);
router.get("/:id", getEmployeeById);
router.get("/user/:userId", getEmployeeByUserId);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;