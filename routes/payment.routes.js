const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const c = require("../controllers/payment.controller");

router.use(verifyToken);

router.post("/", c.addPayment);
router.get("/appointment/:appointmentId", c.getByAppointment);
router.get("/patient/:patientId", c.getByPatient);

module.exports = router;
