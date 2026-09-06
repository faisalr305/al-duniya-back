require("dotenv").config({ path: ".env.test" });

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  await Appointment.deleteMany({});
  await Patient.deleteMany({});
  await Doctor.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

async function signInToken() {
  await request(app)
    .post("/auth/sign-up")
    .send({ username: "doc-test-user", password: "password123" });
  const res = await request(app)
    .post("/auth/sign-in")
    .send({ username: "doc-test-user", password: "password123" });
  return res.body.accessToken;
}

describe("Doctor Routes", () => {
  describe("GET /api/doctors", () => {
    test("requires a valid token", async () => {
      const res = await request(app).get("/api/doctors");
      expect(res.statusCode).toBe(401);
    });

    test("returns the saved doctors for the dropdown", async () => {
      const token = await signInToken();
      await Doctor.create([
        { name: "Dr. Sara Ahmed" },
        { name: "Dr. Omar Khan" },
      ]);

      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.map((d) => d.name).sort()).toEqual([
        "Dr. Omar Khan",
        "Dr. Sara Ahmed",
      ]);
    });
  });

  describe("POST /api/doctors", () => {
    test("creates a doctor", async () => {
      const token = await signInToken();
      const res = await request(app)
        .post("/api/doctors")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Dr. New Doc" });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe("Dr. New Doc");
    });

    test("is idempotent for the same name (case-insensitive)", async () => {
      const token = await signInToken();
      const first = await request(app)
        .post("/api/doctors")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Dr. Sara" });
      const second = await request(app)
        .post("/api/doctors")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "dr sara" });

      expect(second.statusCode).toBe(200);
      expect(second.body._id).toBe(first.body._id);
    });

    test("rejects an empty doctor name", async () => {
      const token = await signInToken();
      const res = await request(app)
        .post("/api/doctors")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "   " });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Doctor name is required");
    });
  });

  describe("PUT and DELETE /api/doctors/:id", () => {
    test("renames a doctor and updates their appointments", async () => {
      const token = await signInToken();
      const doctor = await Doctor.create({ name: "Dr. Before" });
      const patient = await Patient.create({ name: "Test Patient", phone: "+123456789" });
      await Appointment.create({ patient: patient._id, date: new Date(), time: "10:00", doctor: "Dr. Before", service: "Consultation" });

      const res = await request(app).put(`/api/doctors/${doctor._id}`).set("Authorization", `Bearer ${token}`).send({ name: "Dr. After" });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe("Dr. After");
      expect((await Appointment.findOne()).doctor).toBe("Dr. After");
    });

    test("removes a doctor from the active dropdown", async () => {
      const token = await signInToken();
      const doctor = await Doctor.create({ name: "Dr. Retired" });
      const res = await request(app).delete(`/api/doctors/${doctor._id}`).set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.isActive).toBe(false);
      expect((await request(app).get("/api/doctors").set("Authorization", `Bearer ${token}`)).body).toEqual([]);
    });
  });
});
