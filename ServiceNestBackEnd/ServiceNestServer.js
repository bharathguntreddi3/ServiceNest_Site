/**
 * @file ServiceNestServer.js
 * @description Main entry point for the ServiceNest Backend.
 *              Now powered by Firebase Realtime Database instead of MySQL.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db"); // Firebase Realtime Database
const rateLimit = require("express-rate-limit");

const forgotPasswordRoutes = require("./forgotPasswordRoutes");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const shopRoutes = require("./shopRoutes");
const publicRoutes = require("./publicRoutes");

const { strictRateLimiter, globalLimiter } = require("./rateLimiter");

const app = express();
const port = process.env.PORT;

app.set("trust proxy", 1);

// Remove trailing slash from FrontEnd_URL if it exists to prevent CORS mismatch
const allowedOrigin = process.env.FRONTEND_URL.replace(/\/$/, "");
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use("/api", globalLimiter);

// Pass Firebase db instance to forgotPasswordRoutes (same interface as before)
app.use("/api/forgot-password", strictRateLimiter, forgotPasswordRoutes(db));

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", shopRoutes);
app.use("/api", publicRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error Caught:", err);
  const statusCode = err.status || 500;
  res
    .status(statusCode)
    .json({ error: err.message || "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`ServiceNest server running on port ${port}`);
});
