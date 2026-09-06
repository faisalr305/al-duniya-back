const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactNameRegex = (value) => new RegExp(`^${escapeRegex(value)}$`, "i");

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

    const existing = (await Doctor.find()).find(
      (doctor) => doctor.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

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

// PUT /api/doctors/:id — rename a doctor and keep existing appointments aligned.
exports.updateDoctor = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Doctor name is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const duplicate = (await Doctor.find({ _id: { $ne: doctor._id } })).find(
      (candidate) => candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (duplicate) {
      return res.status(409).json({ message: "A doctor with this name already exists" });
    }

    const previousName = doctor.name;
    doctor.name = name;
    await doctor.save();
    await Appointment.updateMany(
      { doctor: exactNameRegex(previousName) },
      { $set: { doctor: name } },
    );
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/doctors/:id — hide a doctor from future booking, retaining history.
exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
