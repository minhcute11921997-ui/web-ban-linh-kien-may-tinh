const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/authValidator");

<<<<<<< HEAD
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
=======

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  
  max: 10,                    
>>>>>>> 63a452d7d755934fa914b27c5a1694c7e72f0d12
  message: {
    success: false,
    message: "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", validate(registerSchema), authController.register);

<<<<<<< HEAD
// loginLimiter
router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  authController.login
);
=======
// loginLimiter 
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
>>>>>>> 63a452d7d755934fa914b27c5a1694c7e72f0d12

router.post("/logout", authController.logout);

<<<<<<< HEAD
// Route refresh
router.post("/refresh", authController.refresh);
=======
// Route refresh 
router.post('/refresh', authController.refresh);
>>>>>>> 63a452d7d755934fa914b27c5a1694c7e72f0d12

router.put("/profile", verifyToken, authController.updateProfile);

router.get("/profile", verifyToken, authController.getProfile);

module.exports = router;
