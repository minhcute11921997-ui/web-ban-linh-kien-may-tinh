// be/src/routes/address.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/addressController');

// Tất cả route đều yêu cầu đăng nhập
router.get('/',           verifyToken, ctrl.getAddresses);
router.post('/',          verifyToken, ctrl.createAddress);
router.put('/:id',        verifyToken, ctrl.updateAddress);
router.delete('/:id',     verifyToken, ctrl.deleteAddress);
router.patch('/:id/default', verifyToken, ctrl.setDefault);

module.exports = router;