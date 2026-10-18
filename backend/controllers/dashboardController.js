const Employee = require("../models/Employee");
const Task = require("../models/Task");

// Get Dashboard Summary & Employee Workload
const getDashboardSummary = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);

        const [
            totalEmployees,
            activeEmployees,
            totalTasks,
            todoTasks,
            inProgressTasks,
            completedTasks,
            cancelledTasks,
            overdueTasks,
            employeeWorkload
        ] = await Promise.all([
            // 1. Total Employees
            Employee.countDocuments({}),

            // 2. Active Employees
            Employee.countDocuments({ status: "Active" }),

            // 3. Total Tasks
            Task.countDocuments({}),

            // 4. Todo Tasks
            Task.countDocuments({ status: "Todo" }),

            // 5. In Progress Tasks
            Task.countDocuments({ status: "In Progress" }),

            // 6. Completed Tasks
            Task.countDocuments({ status: "Completed" }),

            // 7. Cancelled Tasks
            Task.countDocuments({ status: "Cancelled" }),

            // 8. Overdue Tasks: due date earlier than today and status is neither Completed nor Cancelled
            Task.countDocuments({
                dueDate: { $lt: startOfToday },
                status: { $nin: ["Completed", "Cancelled"] }
            }),

            // 9. Employee Workload: employees with active tasks count (status: Todo or In Progress)
            Employee.aggregate([
                {
                    $lookup: {
                        from: "tasks",
                        let: { empId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$assignedEmployee", "$$empId"] },
                                            { $in: ["$status", ["Todo", "In Progress"]] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "activeTasks"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        employeeId: 1,
                        fullName: 1,
                        email: 1,
                        department: 1,
                        role: 1,
                        status: 1,
                        activeTaskCount: { $size: "$activeTasks" }
                    }
                },
                {
                    $sort: { activeTaskCount: -1, fullName: 1 }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalEmployees,
                    activeEmployees,
                    totalTasks,
                    todoTasks,
                    inProgressTasks,
                    completedTasks,
                    cancelledTasks,
                    overdueTasks
                },
                employeeWorkload
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getDashboardSummary
};
