const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Payment = require("../models/Payment");

// POST /api/patients — create new patient
exports.createPatient = async (req, res) => {
  try {
    const existing = await Patient.findOne({ phone: req.body.phone });
    if (existing) {
      // Re-created: restore a previously-deleted patient and merge in the fresh details
      if (existing.archived) {
        existing.set({ ...req.body, archived: false });
        await existing.save();
        return res.status(200).json({ message: "Patient restored", patient: existing });
      }
      return res
        .status(409)
        .json({
          message: "Patient with this phone already exists",
          patient: existing,
        });
    }
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/patients/search?q=... — typeahead search by name or phone
exports.searchPatients = async (req, res) => {
  try {
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");
    const patients = await Patient.find({
      archived: false,
      $or: [{ name: regex }, { phone: regex }],
    })
      .limit(10)
      .select("name phone email");
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/patients/:id — full patient profile with history & totals
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient || patient.archived)
      return res.status(404).json({ message: "Patient not found" });

    const appointments = await Appointment.find({ patient: patient._id }).sort({
      date: -1,
    });
    const payments = await Payment.find({ patient: patient._id }).sort({
      date: -1,
    });

    const totalBilled = appointments.reduce(
      (s, a) => s + (a.totalBill || 0),
      0,
    );
    // `amountPaid` is the authoritative running amount: it includes payments
    // entered when the appointment was created as well as later payments.
    const totalPaid = appointments.reduce((s, a) => s + (a.amountPaid || 0), 0);
    const totalDue = Math.max(0, totalBilled - totalPaid);

    const now = new Date();
    const latestAppointment =
      appointments.find((a) => new Date(a.date) <= now) || null;
    const upcomingAppointment =
      [...appointments].reverse().find((a) => new Date(a.date) > now) || null;

    res.json({
      patient,
      appointments,
      payments,
      totals: { totalBilled, totalPaid, totalDue },
      latestAppointment,
      upcomingAppointment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/patients — list all patients
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ archived: false }).sort({ name: 1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/patients/:id — update patient info
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/patients/:id — soft delete (archive) a patient so their
// appointment/payment history stays intact.
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true },
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json({ message: "Patient deleted", patient });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
