const bcrypt = require('bcryptjs');        
const jwt = require('jsonwebtoken');        
const db = require('../config/db');         

// ĐĂNG KÝ tài khoản mới
exports.register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;

        // Kiểm tra bắt buộc phải có username, email, password
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Kiểm tra username hoặc email đã tồn tại chưa
        const [existingUser] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại' });
        }

        // Mã hoá password trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Thêm user mới vào bảng users
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, phone, address, 'customer']
        );

        res.status(201).json({ success: true, message: 'Đăng ký thành công!', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// ĐĂNG NHẬP
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền username và password' });
        }
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]  
        );


        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Username hoặc password không đúng' });
        }

        const user = users[0]; 

        // So sánh password nhập vào với password đã mã hoá trong database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Username hoặc password không đúng' });
        }

        // Tạo access token (hết hạn sau 1 ngày)
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Tạo refresh token (hết hạn sau 7 ngày)
        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// LÀM MỚI TOKEN khi access token hết hạn
exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Thiếu refresh token' });
        }

        // Xác thực refresh token có hợp lệ không
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Tìm user từ id trong token
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'User không tồn tại' });
        }

        const user = users[0];

        // Tạo access token mới
        const newToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }
};

exports.updateProfile = async (req, res) => {
  const { full_name, email, phone, address } = req.body;
  const userId = req.user.userId;

  try {
    if (email) {
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Email đã được sử dụng bởi tài khoản khác' });
      }
    }

    await db.query(
      'UPDATE users SET full_name=?, email=?, phone=?, address=? WHERE id=?',
      [full_name, email, phone, address, userId]
    );
    res.json({ success: true, user: { full_name, email, phone, address } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};