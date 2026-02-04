const db = require('../config/db');

// Lấy tất cả sản phẩm (có phân trang + tìm kiếm nâng cao)
exports.getAllProducts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            category_id = '',
            min_price = '',
            max_price = '',
            brand = '',
            sort_by = 'created_at',
            order = 'DESC'
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        let params = [];
        
        if (search) {
            query += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category_id) {
            const categoryIds = category_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (categoryIds.length > 0) {
                query += ` AND p.category_id IN (${categoryIds.map(() => '?').join(',')})`;
                params.push(...categoryIds);
            }
        }
        
        if (min_price) {
            query += ' AND p.price >= ?';
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            query += ' AND p.price <= ?';
            params.push(parseFloat(max_price));
        }
        
        if (brand) {
            const brands = brand.split(',').map(b => b.trim());
            if (brands.length > 0) {
                query += ` AND p.brand IN (${brands.map(() => '?').join(',')})`;
                params.push(...brands);
            }
        }
        
        const validSortBy = ['created_at', 'price', 'name', 'stock'];
        const validOrder = ['ASC', 'DESC'];
        
        const sortColumn = validSortBy.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
        
        query += ` ORDER BY p.${sortColumn} ${sortOrder}`;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [products] = await db.query(query, params);
        
        let countQuery = 'SELECT COUNT(*) as count FROM products p WHERE 1=1';
        let countParams = [];
        
        if (search) {
            countQuery += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category_id) {
            const categoryIds = category_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (categoryIds.length > 0) {
                countQuery += ` AND p.category_id IN (${categoryIds.map(() => '?').join(',')})`;
                countParams.push(...categoryIds);
            }
        }
        
        if (min_price) {
            countQuery += ' AND p.price >= ?';
            countParams.push(parseFloat(min_price));
        }
        if (max_price) {
            countQuery += ' AND p.price <= ?';
            countParams.push(parseFloat(max_price));
        }
        
        if (brand) {
            const brands = brand.split(',').map(b => b.trim());
            if (brands.length > 0) {
                countQuery += ` AND p.brand IN (${brands.map(() => '?').join(',')})`;
                countParams.push(...brands);
            }
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
            },
            filters: {
                search,
                category_id,
                min_price,
                max_price,
                brand,
                sort_by: sortColumn,
                order: sortOrder
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

// Lấy chi tiết 1 sản phẩm
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
