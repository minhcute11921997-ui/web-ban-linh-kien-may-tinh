const db   = require('../config/db');
const Joi  = require('joi');

const schema = Joi.object({
  receiver:      Joi.string().max(100).required().messages({ 'any.required': 'Vui lòng nhập tên người nhận' }),
  phone:         Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).required().messages({
                   'any.required': 'Vui lòng nhập số điện thoại',
                   'string.pattern.base': 'Số điện thoại không hợp lệ',
                 }),
  province_code: Joi.string().required().messages({ 'any.required': 'Vui lòng chọn tỉnh/thành' }),
  province_name: Joi.string().required(),
  district_code: Joi.string().required().messages({ 'any.required': 'Vui lòng chọn quận/huyện' }),
  district_name: Joi.string().required(),
  ward_code:     Joi.string().required().messages({ 'any.required': 'Vui lòng chọn phường/xã' }),
  ward_name:     Joi.string().required(),
  detail_address:Joi.string().max(255).required().messages({ 'any.required': 'Vui lòng nhập số nhà, tên đường' }),
  full_address:  Joi.string().max(500).required(),
  is_default:    Joi.boolean().default(false),
});

const handleError = (res, err, action) => {
  console.error(`[${action}]`, err);
  res.status(500).json({ success: false, message: 'Lỗi server' });
};

/* GET /api/addresses */
exports.getAddresses = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { handleError(res, err, 'getAddresses'); }
};

/* POST /api/addresses */
exports.createAddress = async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error)
    return res.status(400).json({ success: false, message: error.details.map(d => d.message).join('; ') });

  try {
    const uid = req.user.userId;
    const { receiver, phone, province_code, province_name, district_code, district_name,
            ward_code, ward_name, detail_address, full_address, is_default } = value;

    if (is_default)
      await db.query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [uid]);

    // Địa chỉ đầu tiên tự động thành mặc định
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM user_addresses WHERE user_id = ?', [uid]
    );
    const setDefault = cnt === 0 ? 1 : (is_default ? 1 : 0);

    const [result] = await db.query(
      `INSERT INTO user_addresses
        (user_id, receiver, phone, province_code, province_name, district_code, district_name,
         ward_code, ward_name, detail_address, full_address, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, receiver, phone, province_code, province_name, district_code, district_name,
       ward_code, ward_name, detail_address, full_address, setDefault]
    );

    res.status(201).json({ success: true, message: 'Thêm địa chỉ thành công', id: result.insertId });
  } catch (err) { handleError(res, err, 'createAddress'); }
};

/* PUT /api/addresses/:id */
exports.updateAddress = async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error)
    return res.status(400).json({ success: false, message: error.details.map(d => d.message).join('; ') });

  try {
    const uid = req.user.userId;
    const { id } = req.params;
    const { receiver, phone, province_code, province_name, district_code, district_name,
            ward_code, ward_name, detail_address, full_address, is_default } = value;

    const [[addr]] = await db.query(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!addr)
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });

    if (is_default)
      await db.query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [uid]);

    await db.query(
      `UPDATE user_addresses SET
        receiver=?, phone=?, province_code=?, province_name=?, district_code=?, district_name=?,
        ward_code=?, ward_name=?, detail_address=?, full_address=?, is_default=?
       WHERE id=? AND user_id=?`,
      [receiver, phone, province_code, province_name, district_code, district_name,
       ward_code, ward_name, detail_address, full_address, is_default ? 1 : 0, id, uid]
    );

    res.json({ success: true, message: 'Cập nhật địa chỉ thành công' });
  } catch (err) { handleError(res, err, 'updateAddress'); }
};

/* DELETE /api/addresses/:id */
exports.deleteAddress = async (req, res) => {
  try {
    const uid = req.user.userId;
    const { id } = req.params;

    const [[addr]] = await db.query(
      'SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!addr)
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });

    await db.query('DELETE FROM user_addresses WHERE id = ?', [id]);

    // Nếu xóa địa chỉ mặc định → tự set địa chỉ mới nhất còn lại làm mặc định
    if (addr.is_default) {
      await db.query(
        'UPDATE user_addresses SET is_default = 1 WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
        [uid]
      );
    }

    res.json({ success: true, message: 'Đã xóa địa chỉ' });
  } catch (err) { handleError(res, err, 'deleteAddress'); }
};

/* PATCH /api/addresses/:id/default */
exports.setDefault = async (req, res) => {
  try {
    const uid = req.user.userId;
    const { id } = req.params;

    const [[addr]] = await db.query(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!addr)
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });

    await db.query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [uid]);
    await db.query('UPDATE user_addresses SET is_default = 1 WHERE id = ?', [id]);

    res.json({ success: true, message: 'Đã đặt địa chỉ mặc định' });
  } catch (err) { handleError(res, err, 'setDefault'); }
};