const router = require("express").Router();
const c = require("../controllers/patient.controller");

router.get("/search", c.searchPatients);
router.get("/", c.getAllPatients);
router.post("/", c.createPatient);
router.get("/:id", c.getPatientById);
router.put("/:id", c.updatePatient);

module.exports = router;
