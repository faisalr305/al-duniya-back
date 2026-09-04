const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Payment = require("../models/Payment");

// POST /api/appointments — create appointment (auto-create patient if new)
exports.createAppointment = async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientPhone,
      date,
      time,
      doctor,
      service,
      totalBill,
      amountPaid,
      notes,
    } = req.body;

    let patient;
    if (patientId) {
      patient = await Patient.findById(patientId);
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });
    } else {
      // Auto-create patient if not found by phone
      patient = await Patient.findOne({ phone: patientPhone });
      if (!patient) {
        patient = await Patient.create({
          name: patientName,
          phone: patientPhone,
        });
      } else if (patient.archived) {
        // Rebooking a deleted patient by phone brings them back.

        patient.archived = false;
        await patient.save();
      }
    }

    const paid = Number(amountPaid) || 0;
    const bill = Number(totalBill) || 0;
    const due = Math.max(0, bill - paid);
    const paymentStatus =
      due === 0 && paid > 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";

    const appointment = new Appointment({
      patient: patient._id,
      date,
      time,
      doctor,
      service,
      totalBill: bill,
      amountPaid: paid,
      amountDue: due,
      paymentStatus,
      notes,
    });
    await appointment.save();
    await appointment.populate("patient");
    res.status(201).json(appointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/appointments/date/:date — appointments for a specific day (YYYY-MM-DD)
exports.getByDate = async (req, res) => {
  try {
    const start = new Date(req.params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const appointments = await Appointment.find({
      date: { $gte: start, $lt: end },
      archived: false,
    })
      .populate("patient")
      .sort({ time: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/appointments/range?start=&end= — appointments in a date range (for calendar)
exports.getByRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    const appointments = await Appointment.find({
      date: { $gte: new Date(start), $lte: new Date(end) },
      archived: false,
    })
      .populate("patient")
      .sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/appointments/dashboard — today, tomorrow, upcoming, recent
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const pastStart = new Date(todayStart);
    pastStart.setDate(pastStart.getDate() - 30);

    const [todays, tomorrows, upcoming, recent, allTime, paymentsTodayArr] =
      await Promise.all([
        Appointment.find({
          date: { $gte: todayStart, $lte: todayEnd },
          archived: false,
        })
          .populate("patient")
          .sort({ time: 1 }),
        Appointment.find({
          date: { $gte: tomorrowStart, $lte: tomorrowEnd },
          archived: false,
        })
          .populate("patient")
          .sort({ time: 1 }),
        Appointment.find({
          date: { $gt: tomorrowEnd, $lte: weekEnd },
          archived: false,
        })
          .populate("patient")
          .sort({ date: 1, time: 1 }),
        Appointment.find({
          date: { $gte: pastStart, $lt: todayStart },
          archived: false,
        })
          .populate("patient")
          .sort({ date: -1 })
          .limit(10),
        Appointment.find({ archived: false }),
        Payment.find({ date: { $gte: todayStart, $lte: todayEnd } }),
      ]);

    const totalBilled = allTime.reduce((s, a) => s + (a.totalBill || 0), 0);
    const totalPaid = allTime.reduce((s, a) => s + (a.amountPaid || 0), 0);
    const totalDue = allTime.reduce((s, a) => s + (a.amountDue || 0), 0);
    const paymentsToday = paymentsTodayArr.reduce(
      (s, p) => s + (p.amount || 0),
      0,
    );
    const todaysDue = todays.reduce((s, a) => s + (a.amountDue || 0), 0);

    res.json({
      todays,
      tomorrows,
      upcoming,
      recent,
      stats: { totalBilled, totalPaid, totalDue, paymentsToday, todaysDue },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/appointments — filter/search all appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const {
      patient,
      doctor,
      service,
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
    } = req.query;
    const filter = {};
    if (patient) filter.patient = patient;
    if (doctor) filter.doctor = new RegExp(doctor, "i");
    if (service) filter.service = new RegExp(service, "i");
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    let appointments = await Appointment.find(filter)
      .populate("patient")
      .sort({ date: -1 });
    if (search) {
      const re = new RegExp(search, "i");
      appointments = appointments.filter(
        (a) =>
          re.test(a.patient?.name) ||
          re.test(a.patient?.phone) ||
          re.test(a.doctor) ||
          re.test(a.service),
      );
    }
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/appointments/:id
exports.getById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate(
      "patient",
    );
    if (!appointment) return res.status(404).json({ message: "Not found" });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/appointments/:id — update appointment
exports.updateAppointment = async (req, res) => {
  try {
    const updates = { ...req.body };
    // Recalculate due if billing fields change
    if (updates.totalBill !== undefined || updates.amountPaid !== undefined) {
      const current = await Appointment.findById(req.params.id);
      const bill =
        updates.totalBill !== undefined
          ? Number(updates.totalBill)
          : current.totalBill;
      const paid =
        updates.amountPaid !== undefined
          ? Number(updates.amountPaid)
          : current.amountPaid;
      updates.amountDue = Math.max(0, bill - paid);
      updates.paymentStatus =
        updates.amountDue === 0 && paid > 0
          ? "Paid"
          : paid > 0
            ? "Partial"
            : "Unpaid";
    }
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    ).populate("patient");
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/appointments/:id — soft archive
exports.archiveAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true },
    );
    if (!appointment) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Appointment archived", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
