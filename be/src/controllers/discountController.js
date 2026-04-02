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

// Admin: Lấy tất cả mã giảm giá
exports.adminGetAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM discount_codes ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Tạo mã giảm giá mới
exports.adminCreate = async (req, res) => {
  try {
    const { code, type, value, description, min_order_value, max_uses, expires_at } = req.body;

    if (!code || !type || value === undefined)
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });

    if (!['percent', 'fixed'].includes(type))
      return res.status(400).json({ success: false, message: 'Loại giảm giá không hợp lệ (percent | fixed)' });

    if (type === 'percent' && (value <= 0 || value > 100))
      return res.status(400).json({ success: false, message: 'Phần trăm giảm phải từ 1–100' });

    if (type === 'fixed' && value <= 0)
      return res.status(400).json({ success: false, message: 'Số tiền giảm phải lớn hơn 0' });

    const upperCode = code.toUpperCase().trim();

    // Kiểm tra trùng code
    const [[existing]] = await db.query(
      'SELECT id FROM discount_codes WHERE code = ?', [upperCode]
    );
    if (existing)
      return res.status(409).json({ success: false, message: 'Mã giảm giá đã tồn tại' });

    const [result] = await db.query(
      `INSERT INTO discount_codes 
        (code, type, value, description, min_order_value, max_uses, expires_at, active, used_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        upperCode,
        type,
        value,
        description || null,
        min_order_value || 0,
        max_uses || null,
        expires_at || null,
      ]
    );

    const [[newDiscount]] = await db.query(
      'SELECT * FROM discount_codes WHERE id = ?', [result.insertId]
    );

    res.status(201).json({ success: true, message: 'Tạo mã giảm giá thành công', data: newDiscount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Cập nhật mã giảm giá
exports.adminUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, description, min_order_value, max_uses, expires_at, active } = req.body;

    const [[discount]] = await db.query('SELECT * FROM discount_codes WHERE id = ?', [id]);
    if (!discount)
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });

    await db.query(
      `UPDATE discount_codes SET
        type = ?, value = ?, description = ?,
        min_order_value = ?, max_uses = ?,
        expires_at = ?, active = ?
       WHERE id = ?`,
      [
        type ?? discount.type,
        value ?? discount.value,
        description !== undefined ? description : discount.description,
        min_order_value ?? discount.min_order_value,
        max_uses !== undefined ? max_uses : discount.max_uses,
        expires_at !== undefined ? expires_at : discount.expires_at,
        active !== undefined ? active : discount.active,
        id,
      ]
    );

    const [[updated]] = await db.query('SELECT * FROM discount_codes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Cập nhật thành công', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Xóa mã giảm giá
exports.adminDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const [[discount]] = await db.query('SELECT * FROM discount_codes WHERE id = ?', [id]);
    if (!discount)
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });

    await db.query('DELETE FROM discount_codes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Xóa mã giảm giá thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};