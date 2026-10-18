const express = require("express");
const router = express.Router();

const {
    createEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} = require("../controllers/employeeController");

// Add employee
router.post("/", createEmployee);

// Get all employees
router.get("/", getEmployees);

// Get employee by ID
router.get("/:id", getEmployeeById);

// Update employee
router.put("/:id", updateEmployee);
// Delete employee
router.delete("/:id", deleteEmployee);
module.exports = router;