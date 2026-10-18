const express = require("express");
const router = express.Router();

const { getDashboardSummary } = require("../controllers/dashboardController");

// GET /api/dashboard
router.get("/", getDashboardSummary);

module.exports = router;
