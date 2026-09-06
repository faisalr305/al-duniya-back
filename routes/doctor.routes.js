const router = require("express").Router();
const c = require("../controllers/doctor.controller");

router.get("/", c.getDoctors);
router.post("/", c.createDoctor);

module.exports = router;