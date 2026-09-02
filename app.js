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

// Middleware
app.use(
  cors({
    origin: "https://al-duniya-appointment.netlify.app",
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
