const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth'); 

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// ✅ POST /api/auth/refresh 
router.post('/refresh', authController.refresh);

router.put('/profile', verifyToken, authController.updateProfile);

module.exports = router;
