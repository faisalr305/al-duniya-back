const Doctor = require("../models/Doctor");

// GET /api/doctors — every doctor used in the clinic, for the booking dropdown.
exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true }).sort({ name: 1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/doctors — add a doctor (idempotent by name, case-insensitive).
exports.createDoctor = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Doctor name is required" });
    }

    const existing = await Doctor.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
      return res.json(existing);
    }

    const doctor = await Doctor.create({ name });
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};