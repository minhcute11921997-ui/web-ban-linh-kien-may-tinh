const bcrypt = require('bcryptjs');         // Mã hoá / so sánh password
const jwt = require('jsonwebtoken');         // Tạo và xác thực JWT token
const User = require('../models/User');      // Import User model

// ĐĂNG KÝ tài khoản mới
exports.register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;

        // Kiểm tra bắt buộc phải có username, email, password
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Kiểm tra username hoặc email đã tồn tại chưa
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại' });
        }

        // Mã hoá password trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới và lưu vào MongoDB
        const newUser = new User({ username, email, password: hashedPassword, full_name, phone, address });
        await newUser.save();

        res.status(201).json({ success: true, message: 'Đăng ký thành công!', userId: newUser._id });
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

        // Tìm user theo username trong MongoDB
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Username hoặc password không đúng' });
        }

        // So sánh password nhập vào với password đã mã hoá trong database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Username hoặc password không đúng' });
        }

        // Tạo access token (hết hạn sau 1 ngày)
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Tạo refresh token (hết hạn sau 7 ngày)
        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            refreshToken,
            user: { id: user._id, username: user.username, role: user.role } // Trả về thông tin user
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
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User không tồn tại' });
        }

        // Tạo access token mới
        const newToken = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }
};
