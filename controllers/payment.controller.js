const Payment = require("../models/Payment");
const Appointment = require("../models/Appointment");

// POST /api/payments — add a payment to an appointment
exports.addPayment = async (req, res) => {
  try {
    const { appointmentId, amount, method, notes } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0)
      return res.status(400).json({ message: "Amount must be positive" });

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    const payment = await Payment.create({
      patient: appointment.patient,
      appointment: appointmentId,
      amount: amt,
      method: method || "Cash",
      notes,
    });

    // Update appointment paid/due
    const newPaid = (appointment.amountPaid || 0) + amt;
    const newDue = Math.max(0, (appointment.totalBill || 0) - newPaid);
    const paymentStatus = newDue === 0 ? "Paid" : "Partial";
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { amountPaid: newPaid, amountDue: newDue, paymentStatus },
      { new: true },
    ).populate("patient");

    res.status(201).json({ payment, appointment: updatedAppointment });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/payments/appointment/:appointmentId — list payments for an appointment
exports.getByAppointment = async (req, res) => {
  try {
    const payments = await Payment.find({
      appointment: req.params.appointmentId,
    }).sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/payments/patient/:patientId — all payments by patient
exports.getByPatient = async (req, res) => {
  try {
    const payments = await Payment.find({ patient: req.params.patientId }).sort(
      { date: -1 },
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
