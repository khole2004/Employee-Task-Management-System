const express = require("express");
const router = express.Router();

const {
    createTask,
    getTasks,
    exportTasksCSV,
    getTaskById,
    updateTask,
    updateTaskStatus,
    deleteTask
} = require("../controllers/taskController");

// Create new task
router.post("/", createTask);

// Get all tasks
router.get("/", getTasks);

// Export tasks as CSV (must be placed before /:id)
router.get("/export/csv", exportTasksCSV);

// Get task by ID
router.get("/:id", getTaskById);

// Update task details
router.put("/:id", updateTask);

// Update task status
router.put("/:id/status", updateTaskStatus);

//Delete task
router.delete("/:id", deleteTask);

module.exports = router;