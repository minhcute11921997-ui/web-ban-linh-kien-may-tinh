const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const db = require("../config/db");

// Schemas validation (Joi)
const updateProfileSchema = Joi.object({
  full_name: Joi.string()
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s]+$/)
    .allow("", null),
  email: Joi.string()
    .email()
    .allow("", null)
    .messages({ "string.email": "Email không hợp lệ" }),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s]{7,15}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Số điện thoại không hợp lệ" }),
  address: Joi.string().max(255).allow("", null),
});

// ĐĂNG KÝ
exports.register = async (req, res) => {
  try {
    const { username, email, password, full_name, phone, address } = req.body;

    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Username hoặc email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        email,
        hashedPassword,
        full_name || null,
        phone || null,
        address || null,
        "customer",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("[register]", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
