const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth'); 
const { loginLimiter } = require('../../server');
const { logout } = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authValidator');

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', logout);
// POST /api/auth/refresh 
router.post('/refresh', authController.refresh);

router.put('/profile', verifyToken, authController.updateProfile);

module.exports = router;
