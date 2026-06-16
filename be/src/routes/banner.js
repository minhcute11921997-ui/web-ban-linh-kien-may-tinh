const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bannerController = require('../controllers/bannerController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '../../uploads/banners');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const position = Number(req.params.position) || 'x';
    cb(null, `banner-${position}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Chi chap nhan file anh (jpg, png, webp, gif)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadBannerImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File banner khong duoc vuot qua 5MB',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'File banner khong hop le',
    });
  });
};

router.get('/', bannerController.getBanners);
router.post(
  '/',
  verifyToken,
  verifyAdmin,
  uploadBannerImage,
  bannerController.createBanner
);
router.post(
  '/:position',
  verifyToken,
  verifyAdmin,
  uploadBannerImage,
  bannerController.updateBanner
);

module.exports = router;
