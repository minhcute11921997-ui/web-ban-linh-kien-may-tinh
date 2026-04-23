const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/authValidator");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", validate(registerSchema), authController.register);

// loginLimiter
router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  authController.login
);

router.post("/logout", authController.logout);

// Route refresh
router.post("/refresh", authController.refresh);

router.put("/profile", verifyToken, authController.updateProfile);

router.get("/profile", verifyToken, authController.getProfile);

module.exports = router;
