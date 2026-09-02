const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const c = require("../controllers/patient.controller");

router.use(verifyToken);

router.get("/search", c.searchPatients);
router.get("/", c.getAllPatients);
router.post("/", c.createPatient);
router.get("/:id", c.getPatientById);
router.put("/:id", c.updatePatient);

module.exports = router;
