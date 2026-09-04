// imports
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const dotenv = require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");

// Routes Import
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const paymentRoutes = require("./routes/payment.routes");

// Database-ready guard. The server boots and starts listening before MongoDB
// finishes connecting (see server.js) so /api/health is always reachable. But
// with `bufferCommands: false`, any model call made before the *initial* Mongo
// connection completes rejects with Mongoose's
// "Cannot call X before initial connection is complete if bufferCommands = false".
// This middleware waits for the connection instead (so requests arriving during
// a Render cold-start just succeed a moment later) and returns a clean 503
// rather than a raw 500/400 when the database genuinely isn't reachable.
const { waitForDatabase } = require("./config/db");
const DB_WAIT_TIMEOUT_MS = Number(process.env.DB_WAIT_TIMEOUT_MS) || 10000;

// Middleware — CORS
// The deployed frontend is hosted on Netlify while this API runs on Render,
// so the production origin is allow-listed by default (independent of env vars).
// CLIENT_URL may hold a single origin or comma-separated origins (extra sites).
const DEFAULT_ALLOWED_ORIGINS = [
  "https://al-duniya-appointment.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

const envOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser / same-origin requests (curl, health checks).
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Denied silently: no CORS headers are emitted, so the browser blocks
      // the response instead of the server returning a misleading 500.
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

// Health check — reports DB connection state (handy on Render / Netlify)
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 0 dis, 1 con, 2 con'ing, 3 dis'ing
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const ok = dbState === 1;
  res
    .status(ok ? 200 : 503)
    .json({ status: ok ? "ok" : "error", database: states[dbState] || "unknown" });
});

// Routes
app.use(async (req, res, next) => {
  try {
    await waitForDatabase(DB_WAIT_TIMEOUT_MS);
    next();
  } catch {
    res.status(503).json({
      status: "error",
      message:
        "Database is not connected yet. Check /api/health and confirm MONGODB_URI is reachable.",
    });
  }
});
app.use("/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);

module.exports = app;
