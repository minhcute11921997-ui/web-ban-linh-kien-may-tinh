const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const productController = require('../controllers/productController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

//Cấu hình upload ảnh local 
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp, gif)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// upload ảnh 
router.post(
  '/upload-image',
  verifyToken,
  verifyAdmin,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy file ảnh' });
    }
    const imageUrl = `/uploads/products/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  }
);

// Public routes
router.get('/', productController.getAllProducts);
router.get('/filters/:categoryId', productController.getFilterOptions);
router.get('/featured', productController.getFeaturedProducts);
router.post('/flash-sale', verifyToken, verifyAdmin, productController.setFlashSale);
router.get('/on-sale', productController.getOnSaleProducts);
router.get('/:id/specs', productController.getProductSpecs);
router.get('/:id', productController.getProductById);
router.patch('/:id/toggle-active', verifyToken, verifyAdmin, productController.toggleActive);

//Admin routes
router.post('/', verifyToken, verifyAdmin, productController.createProduct);
router.put('/:id', verifyToken, verifyAdmin, productController.updateProduct);
router.delete('/:id', verifyToken, verifyAdmin, productController.deleteProduct);

module.exports = router;