const db = require('../config/db');

// Lấy danh sách tất cả users (admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, full_name, email, phone, address, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật thông tin user (admin only)
exports.updateUser = async (req, res) => {
    try {
        const { full_name, email, phone, address, role } = req.body;
        const [result] = await db.query(
            'UPDATE users SET full_name = ?, email = ?, phone = ?, address = ?, role = ? WHERE id = ?',
            [full_name, email, phone, address, role, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
        res.json({ success: true, message: 'Cập nhật người dùng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Xóa user (admin only)
exports.deleteUser = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
        res.json({ success: true, message: 'Xóa người dùng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
