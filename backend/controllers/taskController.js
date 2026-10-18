const Task = require("../models/Task");
const Employee = require("../models/Employee");
const mongoose = require("mongoose");

// Check whether an employee can be assigned a task
const checkEmployee = async (employeeId, startDate, taskId = null) => {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return { error: "Invalid employee ID" };
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
        return { error: "Employee not found" };
    }

    if (employee.status === "Inactive") {
        return { error: "Inactive employees cannot be assigned tasks" };
    }

    const taskDate = new Date(startDate);

    if (employee.status === "On Leave") {
        if (!employee.leaveStartDate || !employee.leaveEndDate) {
            return { error: "Employee leave dates are missing" };
        }

        if (
            taskDate >= employee.leaveStartDate &&
            taskDate <= employee.leaveEndDate
        ) {
            return { error: "Employee is on leave on the task start date" };
        }
    }

    const filter = {
        assignedEmployee: employee._id,
        status: { $in: ["Todo", "In Progress"] }
    };

    if (taskId) {
        filter._id = { $ne: taskId };
    }

    const activeTasks = await Task.countDocuments(filter);

    if (activeTasks >= 3) {
        return { error: "Employee already has 3 active tasks" };
    }

    return { employee };
};


// 1. Create Task
const createTask = async (req, res) => {
    try {
        const {
            title,
            description,
            assignedEmployee,
            startDate,
            dueDate,
            priority
        } = req.body;

        if (
            !title ||
            !description ||
            !assignedEmployee ||
            !startDate ||
            !dueDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required task details"
            });
        }

        const start = new Date(startDate);
        const due = new Date(dueDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(due.getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid task dates"
            });
        }

        if (due < start) {
            return res.status(400).json({
                success: false,
                message: "Due date cannot be before start date"
            });
        }

        const result = await checkEmployee(assignedEmployee, start);

        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        const task = await Task.create({
            title,
            description,
            assignedEmployee: result.employee._id,
            employeeName: result.employee.fullName,
            employeeId: result.employee.employeeId,
            department: result.employee.department,
            startDate: start,
            dueDate: due,
            priority: priority || "Medium"
        });

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: task
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const buildTaskFilter = (query) => {
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.priority) {
        filter.priority = query.priority;
    }

    if (query.department) {
        filter.department = query.department;
    }

    if (query.search && query.search.trim()) {
        const searchText = query.search.trim().replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        filter.$or = [
            { title: { $regex: searchText, $options: "i" } },
            { employeeName: { $regex: searchText, $options: "i" } }
        ];
    }

    if (query.dueDate) {
        const dateStr = query.dueDate.trim();
        const targetDate = new Date(dateStr);
        if (!Number.isNaN(targetDate.getTime())) {
            const startOfDay = new Date(dateStr);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(dateStr);
            endOfDay.setUTCHours(23, 59, 59, 999);
            filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
        }
    }

    return filter;
};

const cleanDescription = (value) => {
    if (value === null || value === undefined) return "";
    let str = String(value);

    // 1. Replace <br>, <br/>, <br /> with newline
    str = str.replace(/<br\s*\/?>/gi, "\n");

    // 2. Replace closing block elements with newline
    str = str.replace(/<\/(p|div|li|h[1-6])>/gi, "\n");

    // 3. Remove all remaining HTML tags
    str = str.replace(/<[^>]+>/g, "");

    // 4. Decode common HTML entities
    str = str
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");

    // 5. Normalize all carriage returns to standard newline \n
    str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 6. Clean up line whitespace and collapse excessive blank lines
    str = str
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");

    return str.trim();
};

const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const formatCSVDate = (date) => {
    if (!date) return "";
    try {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return "";
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    } catch {
        return "";
    }
};

// 2. Get All Tasks
const getTasks = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 10, 1),
            100
        );

        const filter = buildTaskFilter(req.query);

        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder =
            req.query.sortOrder === "asc" || req.query.sortOrder === "1"
                ? 1
                : -1;

        let total = 0;
        let tasks = [];

        if (sortBy === "priority") {
            total = await Task.countDocuments(filter);

            tasks = await Task.aggregate([
                { $match: filter },
                {
                    $addFields: {
                        priorityWeight: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$priority", "Critical"] }, then: 4 },
                                    { case: { $eq: ["$priority", "High"] }, then: 3 },
                                    { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                                    { case: { $eq: ["$priority", "Low"] }, then: 1 }
                                ],
                                default: 0
                            }
                        }
                    }
                },
                { $sort: { priorityWeight: sortOrder, createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit }
            ]);
        } else {
            total = await Task.countDocuments(filter);

            const sortObj = {};
            if (sortBy === "dueDate") {
                sortObj.dueDate = sortOrder;
                sortObj.createdAt = -1;
            } else if (sortBy === "title") {
                sortObj.title = sortOrder;
            } else {
                sortObj.createdAt = sortOrder;
            }

            tasks = await Task.find(filter)
                .sort(sortObj)
                .skip((page - 1) * limit)
                .limit(limit);
        }

        const data = tasks.map((task) => {
            const taskData =
                typeof task.toObject === "function" ? task.toObject() : { ...task };

            const todayStr = new Date().toISOString().split("T")[0];
            const dueDateStr = task.dueDate
                ? new Date(task.dueDate).toISOString().split("T")[0]
                : "";

            taskData.isOverdue =
                Boolean(dueDateStr && dueDateStr < todayStr) &&
                !["Completed", "Cancelled"].includes(task.status);

            return taskData;
        });

        res.status(200).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch tasks",
            error: error.message
        });
    }
};

// Export Tasks as CSV
const exportTasksCSV = async (req, res) => {
    try {
        const filter = buildTaskFilter(req.query);

        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder =
            req.query.sortOrder === "asc" || req.query.sortOrder === "1"
                ? 1
                : -1;

        let tasks = [];

        if (sortBy === "priority") {
            tasks = await Task.aggregate([
                { $match: filter },
                {
                    $addFields: {
                        priorityWeight: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$priority", "Critical"] }, then: 4 },
                                    { case: { $eq: ["$priority", "High"] }, then: 3 },
                                    { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                                    { case: { $eq: ["$priority", "Low"] }, then: 1 }
                                ],
                                default: 0
                            }
                        }
                    }
                },
                { $sort: { priorityWeight: sortOrder, createdAt: -1 } }
            ]);
        } else {
            const sortObj = {};
            if (sortBy === "dueDate") {
                sortObj.dueDate = sortOrder;
                sortObj.createdAt = -1;
            } else if (sortBy === "title") {
                sortObj.title = sortOrder;
            } else {
                sortObj.createdAt = sortOrder;
            }

            tasks = await Task.find(filter).sort(sortObj);
        }

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching tasks found to export."
            });
        }

        // Deduplicate tasks by unique _id / taskId to ensure each task is exported exactly once
        const seen = new Set();
        const uniqueTasks = [];
        for (const task of tasks) {
            const key = String(task._id || task.taskId);
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTasks.push(task);
            }
        }

        const headers = [
            "Task ID",
            "Task Title",
            "Description",
            "Employee Name",
            "Employee ID",
            "Department",
            "Priority",
            "Status",
            "Start Date",
            "Due Date",
            "Completed Date",
            "Overdue Status"
        ];

        const rows = uniqueTasks.map((task) => {
            const todayStr = new Date().toISOString().split("T")[0];
            const dueDateStr = formatCSVDate(task.dueDate);

            const isOverdue =
                Boolean(dueDateStr && dueDateStr < todayStr) &&
                !["Completed", "Cancelled"].includes(task.status);

            const rowCols = [
                escapeCSV(task.taskId || task._id),
                escapeCSV(task.title),
                escapeCSV(cleanDescription(task.description)),
                escapeCSV(task.employeeName),
                escapeCSV(task.employeeId),
                escapeCSV(task.department),
                escapeCSV(task.priority),
                escapeCSV(task.status),
                escapeCSV(formatCSVDate(task.startDate)),
                escapeCSV(formatCSVDate(task.dueDate)),
                escapeCSV(formatCSVDate(task.completedDate)),
                escapeCSV(isOverdue ? "Yes" : "No")
            ];

            return rowCols.join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\r\n");

        const todayStr = new Date().toISOString().split("T")[0];
        const filename = `tasks_export_${todayStr}.csv`;

        // Include UTF-8 Byte Order Mark (BOM) so spreadsheet programs like Excel parse UTF-8 and formatting cleanly
        const BOM = "\uFEFF";

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(BOM + csvContent);
    } catch (error) {
        console.error("Export tasks error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export tasks as CSV",
            error: error.message
        });
    }
};


// 3. Get Task By ID
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        const data = task.toObject();

        data.isOverdue =
            new Date() > task.dueDate &&
            !["Completed", "Cancelled"].includes(task.status);

        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }
};


// 4. Update Task
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (["Completed", "Cancelled"].includes(task.status)) {
            return res.status(400).json({
                success: false,
                message: "Completed or cancelled tasks cannot be edited"
            });
        }

        if (req.body.status !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Use the task status API to change status"
            });
        }

        const newStartDate = req.body.startDate || task.startDate;
        const newDueDate = req.body.dueDate || task.dueDate;

        if (
            Number.isNaN(new Date(newStartDate).getTime()) ||
            Number.isNaN(new Date(newDueDate).getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid task dates"
            });
        }

        if (new Date(newDueDate) < new Date(newStartDate)) {
            return res.status(400).json({
                success: false,
                message: "Due date cannot be before start date"
            });
        }

        const employeeId = req.body.assignedEmployee || task.assignedEmployee;

        const result = await checkEmployee(
            employeeId,
            newStartDate,
            task._id
        );

        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        const allowedFields = [
            "title",
            "description",
            "priority",
            "startDate",
            "dueDate"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                task[field] = req.body[field];
            }
        });

        task.assignedEmployee = result.employee._id;
        task.employeeName = result.employee.fullName;
        task.employeeId = result.employee.employeeId;
        task.department = result.employee.department;

        await task.save();

        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: task
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// 5. Update Task Status
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        const newStatus = req.body.status;

        const allowedTransitions = {
            "Todo": ["In Progress", "Cancelled"],
            "In Progress": ["Completed", "Cancelled"],
            "Completed": [],
            "Cancelled": []
        };

        if (!allowedTransitions[task.status]?.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid task status transition"
            });
        }

        task.status = newStatus;

        if (newStatus === "Completed") {
            task.completedDate = new Date();
        }

        await task.save();

        res.status(200).json({
            success: true,
            message: "Task status updated successfully",
            data: task
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
// Delete Task
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        await Task.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Task deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }
};

// Export functions
module.exports = {
    createTask,
    getTasks,
    exportTasksCSV,
    getTaskById,
    updateTask,
    updateTaskStatus,
    deleteTask
};