const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");

const path = require("path");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();

// Import employee routes
const employeeRoutes = require("./routes/employeeRoutes");
const taskRoutes = require("./routes/taskRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

app.use(cors());
app.use(express.json());

// APIs
app.use("/api/employees", employeeRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Test API
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Employee & Task Management API is running!"
  });
});

// Server configuration
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
console.log("Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000
  })
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });