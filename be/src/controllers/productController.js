// src/controllers/productController.js
const db = require('../config/db');

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const { search, category } = req.query;

        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND p.name LIKE ?';
            params.push(`%${search}%`);
        }
        if (category) {
            query += ' AND p.category_id = ?';
            params.push(category);
        }

        query += ' ORDER BY p.id DESC';

        const [products] = await db.query(query, params);

        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        const product = rows[0];
        if (product.specifications) {
            try { product.specifications = JSON.parse(product.specifications); } catch (e) {}
        }

        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// POST /api/products
const createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, image_url, category_id, brand } = req.body;
        if (!name || !price || !category_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (tên, giá, danh mục)' });
        }
        const [result] = await db.query(
            'INSERT INTO products (name, description, price, stock, image_url, category_id, brand) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, image_url, category_id, brand]
        );
        res.status(201).json({ success: true, message: 'Tạo sản phẩm thành công!', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
    try {
        const { name, description, price, stock, image_url, category_id, brand } = req.body;
        const [result] = await db.query(
            'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ?, brand = ? WHERE id = ?',
            [name, description, price, stock, image_url, category_id, brand, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Xoá sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
const getProductSpecs = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT spec_name, spec_value FROM product_specifications WHERE product_id = ? ORDER BY id',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductSpecs };