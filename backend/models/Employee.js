const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true
    },

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, "Please enter a valid phone number"]
    },

    department: {
      type: String,
      required: true,
      enum: ["Development", "Design", "QA", "HR", "Sales"]
    },

    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true
    },

    joiningDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave"],
      default: "Active"
    },

    skills: {
      type: [String],
      default: []
    },

    leaveStartDate: {
      type: Date,
      required: function () {
        return this.status === "On Leave";
      }
    },

    leaveEndDate: {
      type: Date,
      required: function () {
        return this.status === "On Leave";
      },
      validate: {
        validator: function (value) {
          return (
            !value ||
            !this.leaveStartDate ||
            value >= this.leaveStartDate
          );
        },
        message: "Leave end date must be on or after leave start date"
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Employee", employeeSchema);