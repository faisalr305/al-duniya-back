const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    address: { type: String },
    notes: { type: String },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", PatientSchema);
