const db = require('../config/db');

// Lấy tất cả danh mục
exports.getAllCategories = async (req, res) => {
    try {
        const [categories] = await db.query(
            'SELECT * FROM categories ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Lấy chi tiết danh mục + số lượng sản phẩm
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        
        if (categories.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy danh mục' 
            });
        }
        
        // Đếm số sản phẩm trong danh mục
        const [count] = await db.query(
            'SELECT COUNT(*) as product_count FROM products WHERE category_id = ?',
            [id]
        );
        
        res.json({
            success: true,
            data: {
                ...categories[0],
                product_count: count[0].product_count
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Thêm danh mục mới (Admin only)
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu tên danh mục' 
            });
        }
        
        // Kiểm tra tên danh mục đã tồn tại chưa
        const [existing] = await db.query(
            'SELECT * FROM categories WHERE name = ?',
            [name]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tên danh mục đã tồn tại' 
            });
        }
        
        const [result] = await db.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description]
        );
        
        res.status(201).json({
            success: true,
            message: 'Thêm danh mục thành công',
            categoryId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Cập nhật danh mục (Admin only)
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        const [existing] = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy danh mục' 
            });
        }
        
        // Kiểm tra tên trùng (ngoại trừ chính nó)
        const [duplicate] = await db.query(
            'SELECT * FROM categories WHERE name = ? AND id != ?',
            [name, id]
        );
        
        if (duplicate.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tên danh mục đã tồn tại' 
            });
        }
        
        await db.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description, id]
        );
        
        res.json({
            success: true,
            message: 'Cập nhật danh mục thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Xóa danh mục (Admin only)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra có sản phẩm trong danh mục không
        const [products] = await db.query(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
            [id]
        );
        
        if (products[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Không thể xóa danh mục vì còn ${products[0].count} sản phẩm` 
            });
        }
        
        const [result] = await db.query(
            'DELETE FROM categories WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy danh mục' 
            });
        }
        
        res.json({
            success: true,
            message: 'Xóa danh mục thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};
