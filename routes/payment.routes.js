const router = require("express").Router();
const c = require("../controllers/payment.controller");

router.post("/", c.addPayment);
router.get("/appointment/:appointmentId", c.getByAppointment);
router.get("/patient/:patientId", c.getByPatient);

module.exports = router;
