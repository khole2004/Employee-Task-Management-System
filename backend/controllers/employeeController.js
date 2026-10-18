const Employee = require("../models/Employee");
const Task =require("../models/Task");

// Add new employee
const createEmployee = async (req, res) => {
    try {
        const employee = await Employee.create(req.body);

        res.status(201).json({
            success: true,
            message: "Employee added successfully",
            data: employee
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Employee ID or email already exists"
            });
        }

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all employees
const getEmployees = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 10, 1),
            100
        );

        const filter = {};

        if (req.query.department) {
            filter.department = req.query.department;
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.search) {
            const searchText = req.query.search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                { employeeId: { $regex: searchText, $options: "i" } },
                { fullName: { $regex: searchText, $options: "i" } },
                { email: { $regex: searchText, $options: "i" } }
            ];
        }

        const allowedSortFields = [
            "fullName",
            "employeeId",
            "joiningDate",
            "createdAt"
        ];

        const sortBy = allowedSortFields.includes(req.query.sortBy)
            ? req.query.sortBy
            : "createdAt";

        const sortOrder = req.query.order === "asc" ? 1 : -1;

        const total = await Employee.countDocuments(filter);

        const employees = await Employee.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: employees
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get one employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        res.status(200).json({
            success: true,
            data: employee
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid employee ID"
        });
    }
};
// Update employee
const updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        const fields = [
            "employeeId",
            "fullName",
            "email",
            "phone",
            "department",
            "role",
            "joiningDate",
            "status",
            "skills",
            "leaveStartDate",
            "leaveEndDate"
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                employee[field] = req.body[field];
            }
        });

        await employee.save();

        res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            data: employee
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Employee ID or email already exists"
            });
        }

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
// 5. Delete Employee
const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Check active tasks
        const activeTasks = await Task.countDocuments({
            assignedEmployee: employee._id,
            status: { $in: ["Todo", "In Progress"] }
        });

        if (activeTasks > 0) {
            return res.status(400).json({
                success: false,
                message: "Employee cannot be deleted while active tasks exist"
            });
        }

        await Employee.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Unable to delete employee"
        });
    }
};
module.exports = {
    createEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
};
