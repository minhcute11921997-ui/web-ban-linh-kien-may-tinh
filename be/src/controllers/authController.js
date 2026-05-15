const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const db = require("../config/db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Schemas validation (Joi)
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({ "string.alphanum": "Username chỉ được chứa chữ và số" }),
  email: Joi.string()
    .email()
    .required()
    .messages({ "string.email": "Email không hợp lệ" }),
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({ "string.min": "Password phải có ít nhất 6 ký tự" }),
  full_name: Joi.string().max(100).allow("", null),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s]{7,15}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Số điện thoại không hợp lệ" }),
  address: Joi.string().max(255).allow("", null),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  full_name: Joi.string().max(100).allow("", null),
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

//Helper: validate và trả lỗi ngay nếu không hợp lệ
function validate(schema, data, res) {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    res.status(400).json({ success: false, message: messages });
    return false;
  }
  return true;
}

const issueAuthTokens = async (user) => {
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, refreshToken, expiresAt]
  );

  return { token, refreshToken };
};

const toAuthUser = (user) => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
});

const makeGoogleUsername = async (email) => {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24) || "googleuser";

  for (let i = 0; i < 8; i += 1) {
    const suffix = i === 0 ? "" : String(Math.floor(1000 + Math.random() * 9000));
    const username = `${base}${suffix}`.slice(0, 30);
    const [rows] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
    if (rows.length === 0) return username;
  }

  return `google${crypto.randomBytes(8).toString("hex")}`.slice(0, 30);
};

// ĐĂNG KÝ
exports.register = async (req, res) => {
  try {
    // SỬA: validate bằng Joi thay vì check thủ công
    if (!validate(registerSchema, req.body, res)) return;

    const { username, email, password, full_name, phone, address } = req.body;

    // Kiểm tra username hoặc email đã tồn tại chưa
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

    res
      .status(201)
      .json({
        success: true,
        message: "Đăng ký thành công!",
        userId: result.insertId,
      });
  } catch (error) {
    console.error("[register]", error);
    res.status(500).json({ success: false, message: "Lỗi server" }); 
  }
};

//ĐĂNG NHẬP
exports.login = async (req, res) => {
  try {
    // SỬA: validate bằng Joi
    if (!validate(loginSchema, req.body, res)) return;

    const { username, password } = req.body;

    const [users] = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username]
    );

    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Username hoặc password không đúng" });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Username hoặc password không đúng" });
    }

    const { token, refreshToken } = await issueAuthTokens(user);

    // THÊM MỚI: Lưu refresh token vào DB để có thể revoke
    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      refreshToken,
      user: toAuthUser(user),
    });
  } catch (error) {
    console.error("[login]", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

//LÀM MỚI TOKEN
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: "Chua cau hinh GOOGLE_CLIENT_ID" });
    }
    if (!credential) {
      return res.status(400).json({ success: false, message: "Thieu Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ success: false, message: "Email Google chua duoc xac minh" });
    }

    const email = payload.email.toLowerCase();
    const [existingUsers] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    let user = existingUsers[0];

    if (!user) {
      const username = await makeGoogleUsername(email);
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      const [result] = await db.query(
        "INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [username, email, randomPasswordHash, payload.name || email.split("@")[0], null, null, "customer"]
      );

      const [users] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
      user = users[0];
    }

    const { token, refreshToken } = await issueAuthTokens(user);
    res.json({
      success: true,
      message: "Dang nhap Google thanh cong!",
      token,
      refreshToken,
      user: toAuthUser(user),
    });
  } catch (error) {
    console.error("[googleLogin]", error);
    res.status(401).json({ success: false, message: "Dang nhap Google that bai" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu refresh token" });
    }

    //THÊM MỚI: Kiểm tra token có trong DB không (chống replay sau logout)
    const [storedTokens] = await db.query(
      "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()",
      [refreshToken]
    );
    if (storedTokens.length === 0) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Refresh token không hợp lệ hoặc đã bị thu hồi",
        });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      decoded.userId,
    ]);
    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User không tồn tại" });
    }

    const user = users[0];

    const newToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    await db.query("DELETE FROM refresh_tokens WHERE token = ?", [
      refreshToken,
    ]);

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, newRefreshToken, expiresAt]
    );

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error("[refresh]", error);
    res
      .status(401)
      .json({
        success: false,
        message: "Refresh token không hợp lệ hoặc đã hết hạn",
      });
  }
};

//ĐĂNG XUẤT (THÊM MỚI)
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      //Xóa refresh token khỏi DB → token không dùng được nữa dù chưa hết hạn
      await db.query("DELETE FROM refresh_tokens WHERE token = ?", [
        refreshToken,
      ]);
    }
    res.json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("[logout]", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// CẬP NHẬT PROFILE
exports.updateProfile = async (req, res) => {
  // SỬA: thêm validate cho updateProfile
  if (!validate(updateProfileSchema, req.body, res)) return;

  const { full_name, email, phone, address } = req.body;
  const userId = req.user.userId;

  try {
    if (email) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?", 
        [email, userId]
      );
      if (existing.length > 0) {
        return res
          .status(409)
          .json({
            success: false,
            message: "Email đã được sử dụng bởi tài khoản khác",
          });
      }
    }

    await db.query(
      "UPDATE users SET full_name=?, email=?, phone=?, address=? WHERE id=?",
      [full_name || null, email || null, phone || null, address || null, userId]
    );
    res.json({ success: true, user: { full_name, email, phone, address } });
  } catch (err) {
    console.error("[updateProfile]", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [users] = await db.query(
      "SELECT id, username, full_name, email, phone, address, role FROM users WHERE id = ?",
      [userId]
    );
    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error("[getProfile]", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
