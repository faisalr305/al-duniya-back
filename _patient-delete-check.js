// Temporary validation for patient delete (soft delete) flows (deleted after use).
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./app");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/clinic-appointment-system-del-check");
  const Patient = require("./models/Patient");
  await Patient.deleteMany({});

  // 1) create
  const c1 = await request(app).post("/api/patients").send({ name: "Test Del", phone: "9998887777" });
  console.log("[1] create ->", c1.status, c1.body._id ? "ok" : "MISSING _id");

  const id = c1.body._id;

  // 2) list contains
  const l1 = await request(app).get("/api/patients");
  console.log("[2] list contains ->", l1.status, l1.body.some((p) => p._id === id));

  // 3) delete (soft)
  const d = await request(app).delete(`/api/patients/${id}`);
  console.log("[3] delete ->", d.status, d.body.message);

  // 4) list excludes
  const l2 = await request(app).get("/api/patients");
  console.log("[4] list excludes ->", l2.status, !l2.body.some((p) => p._id === id));

  // 5) search excludes
  const s = await request(app).get("/api/patients/search?q=9998887777");
  console.log("[5] search excludes ->", s.status, s.body.length === 0);

  // 6) profile now 404
  const g = await request(app).get(`/api/patients/${id}`);
  console.log("[6] profile ->", g.status);

  // 7) create same phone restores + flags archived false
  const c2 = await request(app).post("/api/patients").send({ name: "Test Del 2", phone: "9998887777", email: "new@x.com" });
  console.log("[7] recreate restore ->", c2.status, c2.body.patient?.archived === false, c2.body.patient?.name);

  // 8) now in list again
  const l3 = await request(app).get("/api/patients");
  console.log("[8] list again contains ->", l3.status, l3.body.some((p) => p._id === id && !p.archived));

  // 9) delete again, then rebook via appointment brings back
  await request(app).delete(`/api/patients/${id}`);
  const appt = await request(app).post("/api/appointments").send({
    patientName: "Test Del 3",
    patientPhone: "9998887777",
    date: "2026-09-10",
    time: "10:00",
    doctor: "Dr. X",
    service: "Checkup",
    totalBill: 100,
  });
  console.log("[9] rebook creates+restores ->", appt.status,, Boolean(appt.body.patient), appt.body.patient);
  const l4 = await request(app).get("/api/patients");
  console.log("[10] list after rebook ->", l4.status, l4.body.some((p) => p._id === id && !p.archived));

  await mongoose.disconnect();
  console.log(l2.status === 200 && !l2.body.some((p) => p._id === id) && g.status === 404 && c2.body.patient?.archived === false ? "PATIENT_DELETE_CHECK_PASSED" : "PATIENT_DELETE_CHECK_FAILED");
  process.exit(0);
})().catch((e) => {
  console.error("PATIENT_DELETE_CHECK_FAILED", e);
  process.exit(1);
});