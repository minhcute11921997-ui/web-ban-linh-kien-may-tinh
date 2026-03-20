const db = require('../config/db');


exports.validateDiscount = async (req, res) => {
  try {
    const { code, totalPrice } = req.query;

    if (!code)
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });

    const [[discount]] = await db.query(
      'SELECT * FROM discount_codes WHERE code = ? AND active = 1',
      [code.toUpperCase()]
    );

    if (!discount)
      return res.status(404).json({ success: false, message: 'Mã giảm giá không hợp lệ' });

    // Kiểm tra hết hạn
    if (discount.expires_at && new Date(discount.expires_at) < new Date())
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn' });

    // Kiểm tra số lần dùng
    if (discount.max_uses !== null && discount.used_count >= discount.max_uses)
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng' });

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (totalPrice && Number(totalPrice) < discount.min_order_value)
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${Number(discount.min_order_value).toLocaleString('vi-VN')}₫ để dùng mã này`
      });

    // Tính tiền giảm
    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = Math.floor(Number(totalPrice) * (discount.value / 100));
    } else {
      discountAmount = Math.min(discount.value, Number(totalPrice));
    }

    res.json({
      success: true,
      data: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description,
        discountAmount,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Lấy danh sách mã còn hiệu lực
exports.getAvailableDiscounts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT code, type, value, description, min_order_value, expires_at
       FROM discount_codes
       WHERE active = 1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Hàm nội bộ dùng khi tạo order — tăng used_count
exports.incrementUsedCount = async (code) => {
  await db.query(
    'UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?',
    [code.toUpperCase()]
  );
};