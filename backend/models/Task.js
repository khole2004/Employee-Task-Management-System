const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        taskId: {
            type: String,
            unique: true,
            default: () => `TASK-${Date.now()}`
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true
        },

        assignedEmployee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true
        },

        employeeName: {
            type: String,
            required: true
        },

        employeeId: {
            type: String,
            required: true
        },

        department: {
            type: String,
            required: true,
            enum: ["Development", "Design", "QA", "HR", "Sales"]
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium"
        },

        status: {
            type: String,
            enum: ["Todo", "In Progress", "Completed", "Cancelled"],
            default: "Todo"
        },

        startDate: {
            type: Date,
            required: true
        },

        dueDate: {
            type: Date,
            required: true,
            validate: {
                validator: function (value) {
                    return !this.startDate || value >= this.startDate;
                },
                message: "Due date cannot be before start date"
            }
        },

        completedDate: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Task", taskSchema);