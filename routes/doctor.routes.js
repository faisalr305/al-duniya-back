const router = require("express").Router();
const c = require("../controllers/doctor.controller");

router.get("/", c.getDoctors);
router.post("/", c.createDoctor);
router.put("/:id", c.updateDoctor);
router.delete("/:id", c.deleteDoctor);

module.exports = router;
