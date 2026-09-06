const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Case-insensitive ensure + return, so the appointment-form dropdown never
// shows near-duplicate doctors ("Dr. Sara" vs "dr sara").
DoctorSchema.statics.ensureName = async function (name) {
  const clean = String(name || "").trim();
  if (!clean) return null;

  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let doctor = await this.findOne({
    name: { $regex: `^${escaped}$`, $options: "i" },
  });

  if (doctor) {
    if (!doctor.isActive) {
      doctor.isActive = true;
      await doctor.save();
    }
    return doctor;
  }

  return this.create({ name: clean });
};

module.exports = mongoose.model("Doctor", DoctorSchema);