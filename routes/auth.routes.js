const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const authController = require('../controllers/auth.controller')

router.post("/sign-up", authController.signUp );
router.post("/signup", authController.signUp );

router.post("/sign-in",  authController.signIn);
router.post("/login", authController.signIn);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/me", verifyToken, authController.verifyUser);

module.exports = router;
