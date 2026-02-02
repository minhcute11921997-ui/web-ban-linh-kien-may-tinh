const db = require('../config/db');

// Lấy tất cả sản phẩm (có phân trang + tìm kiếm)
exports.getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category_id = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        let params = [];
        
        // Tìm kiếm theo tên hoặc brand
        if (search) {
            query += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        // Lọc theo category
        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(category_id);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [products] = await db.query(query, params);
        
        // Đếm tổng số sản phẩm
        let countQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
        let countParams = [];
        if (search) {
            countQuery += ' AND (name LIKE ? OR brand LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (category_id) {
            countQuery += ' AND category_id = ?';
            countParams.push(category_id);
        }
        
        const [total] = await db.query(countQuery, countParams);
        
        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].count,
                totalPages: Math.ceil(total[0].count / limit)
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

// Lấy chi tiết 1 sản phẩm + thông số kỹ thuật
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [products] = await db.query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [id]
        );
        
        if (products.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm' 
            });
        }
        
        // Lấy thông số kỹ thuật
        const [specs] = await db.query(
            'SELECT * FROM product_specifications WHERE product_id = ?',
            [id]
        );
        
        res.json({
            success: true,
            data: {
                ...products[0],
                specifications: specs
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

// Thêm sản phẩm mới (Admin only)
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, category_id, brand, image_url, specifications } = req.body;
        
        // Validation
        if (!name || !price || !category_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin bắt buộc (name, price, category_id)' 
            });
        }
        
        const [result] = await db.query(
            'INSERT INTO products (name, description, price, stock, category_id, brand, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, stock || 0, category_id, brand, image_url]
        );
        
        const productId = result.insertId;
        
        // Thêm thông số kỹ thuật nếu có
        if (specifications && Array.isArray(specifications) && specifications.length > 0) {
            for (const spec of specifications) {
                await db.query(
                    'INSERT INTO product_specifications (product_id, spec_name, spec_value) VALUES (?, ?, ?)',
                    [productId, spec.spec_name, spec.spec_value]
                );
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Thêm sản phẩm thành công',
            productId
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Cập nhật sản phẩm (Admin only)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, category_id, brand, image_url, specifications } = req.body;
        
        // Kiểm tra sản phẩm có tồn tại không
        const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm' 
            });
        }
        
        await db.query(
            'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, brand = ?, image_url = ? WHERE id = ?',
            [name, description, price, stock, category_id, brand, image_url, id]
        );
        
        // Cập nhật thông số kỹ thuật (xóa cũ, thêm mới)
        if (specifications && Array.isArray(specifications)) {
            await db.query('DELETE FROM product_specifications WHERE product_id = ?', [id]);
            
            for (const spec of specifications) {
                await db.query(
                    'INSERT INTO product_specifications (product_id, spec_name, spec_value) VALUES (?, ?, ?)',
                    [id, spec.spec_name, spec.spec_value]
                );
            }
        }
        
        res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Xóa sản phẩm (Admin only)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm' 
            });
        }
        
        res.json({
            success: true,
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};
