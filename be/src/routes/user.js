const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Admin only routes
router.get('/', verifyToken, verifyAdmin, userController.getAllUsers);
router.put('/:id', verifyToken, verifyAdmin, userController.updateUser);
router.delete('/:id', verifyToken, verifyAdmin, userController.deleteUser);

module.exports = router;
