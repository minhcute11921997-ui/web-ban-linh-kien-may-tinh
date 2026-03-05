const db = require('../config/db');

exports.getAllCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories');
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, data: categories[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, image_url } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
        }
        const [result] = await db.query(
            'INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)',
            [name, description, image_url]
        );
        res.status(201).json({ success: true, message: 'Tạo danh mục thành công!', categoryId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { name, description, image_url } = req.body;
        const [result] = await db.query(
            'UPDATE categories SET name = ?, description = ?, image_url = ? WHERE id = ?',
            [name, description, image_url, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, message: 'Cập nhật danh mục thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, message: 'Xoá danh mục thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
