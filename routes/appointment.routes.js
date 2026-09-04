const router = require("express").Router();
const c = require("../controllers/appointment.controller");

router.get("/dashboard", c.getDashboard);
router.get("/date/:date", c.getByDate);
router.get("/range", c.getByRange);
router.get("/", c.getAllAppointments);
router.post("/", c.createAppointment);
router.get("/patient/:patientId", c.getByPatient);
router.get("/:id", c.getById);
router.put("/:id", c.updateAppointment);
router.patch("/:id/status", c.updateAppointment);
router.patch("/:id/archive", c.archiveAppointment);
router.delete("/:id", c.archiveAppointment);

module.exports = router;
