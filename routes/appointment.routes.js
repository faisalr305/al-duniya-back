const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const c = require("../controllers/appointment.controller");

router.use(verifyToken);

router.get("/dashboard", c.getDashboard);
router.get("/date/:date", c.getByDate);
router.get("/range", c.getByRange);
router.get("/", c.getAllAppointments);
router.post("/", c.createAppointment);
router.get("/:id", c.getById);
router.put("/:id", c.updateAppointment);
router.delete("/:id", c.archiveAppointment);

module.exports = router;
