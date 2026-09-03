// imports
const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const morgan = require("morgan");
const cors = require("cors");

// Routes Import
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const paymentRoutes = require("./routes/payment.routes");

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

// Routes
app.use("/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);

module.exports = app;
