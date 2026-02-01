const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Đăng ký user mới
exports.register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ thông tin' 
            });
        }

        const [existingUser] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username hoặc email đã tồn tại' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, phone, address, 'customer']
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Lỗi register:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền username và password' 
            });
        }
        console.log('🔍 Đang tìm user:', username);
        console.log('🔍 Chuẩn bị query database...');

        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Username hoặc password không đúng' 
            });
        }

        const user = users[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Username hoặc password không đúng' 
            });
        }

        // ✅ TẠO ACCESS TOKEN (15 phút)
        const accessToken = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }  // 15 phút
        );

        // ✅ TẠO REFRESH TOKEN (7 ngày)
        const refreshToken = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }  // 7 ngày
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            accessToken,      // Token ngắn hạn
            refreshToken,     // Token dài hạn
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Lỗi login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// ✅ API REFRESH TOKEN MỚI
exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Refresh token không tồn tại' 
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Kiểm tra user còn tồn tại
        const [users] = await db.query(
            'SELECT * FROM users WHERE id = ?', 
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'User không tồn tại' 
            });
        }

        const user = users[0];

        // Tạo access token mới
        const newAccessToken = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({
            success: true,
            message: 'Refresh token thành công!',
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error('Lỗi refresh:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Refresh token hết hạn, vui lòng đăng nhập lại' 
            });
        }
        
        return res.status(401).json({ 
            success: false, 
            message: 'Refresh token không hợp lệ' 
        });
    }
};
