// src/controllers/productController.js
const db = require('../config/db');

// GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, sortBy, sortOrder, specs } = req.query;

        let query = 'SELECT DISTINCT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id';
        const params = [];
        const specFilters = specs ? JSON.parse(specs) : {};
        const specKeys = Object.keys(specFilters);

        // JOIN product_specifications cho mỗi spec filter
        specKeys.forEach((specName, i) => {
            query += ` INNER JOIN product_specifications ps${i} ON ps${i}.product_id = p.id AND ps${i}.spec_name = ? AND ps${i}.spec_value = ?`;
            params.push(specName, specFilters[specName]);
        });

        query += ' WHERE 1=1';

        if (search) {
            query += ' AND p.name LIKE ?';
            params.push(`%${search}%`);
        }
        if (category) {
            query += ' AND p.category_id = ?';
            params.push(category);
        }
        if (req.query.brand) {
            query += ' AND p.brand = ?';
            params.push(req.query.brand);
        }
        if (minPrice) {
            query += ' AND p.price >= ?';
            params.push(Number(minPrice));
        }
        if (maxPrice) {
            query += ' AND p.price <= ?';
            params.push(Number(maxPrice));
        }

        // Sắp xếp
        const allowedSort = ['price', 'name', 'created_at', 'id'];
        const allowedOrder = ['ASC', 'DESC'];
        const sort = allowedSort.includes(sortBy) ? sortBy : 'id';
        const order = allowedOrder.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        query += ` ORDER BY p.${sort} ${order}`;

        // Đếm tổng số sản phẩm (không limit)
const countQuery = query.replace(
    /^SELECT DISTINCT p\.\*, c\.name as category_name/,
    'SELECT COUNT(DISTINCT p.id) as total'
).replace(/ ORDER BY p\.\w+ (ASC|DESC)$/, '');
const [[{ total }]] = await db.query(countQuery, params);

// Thêm pagination
const limit = Math.min(parseInt(req.query.limit) || 12, 100);
const page  = Math.max(parseInt(req.query.page) || 1, 1);
const offset = (page - 1) * limit;
query += ` LIMIT ${limit} OFFSET ${offset}`;

const [products] = await db.query(query, params);

res.json({
    success: true,
    data: products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
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
// GET /api/products/featured
const getFeaturedProducts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, c.name as category_name,
                   COALESCE(SUM(oi.quantity), 0) as total_sold
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON oi.product_id = p.id
            WHERE p.stock > 0
            GROUP BY p.id
            ORDER BY total_sold DESC, p.id DESC
            LIMIT 8
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products/on-sale
const getOnSaleProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.discount_percent > 0 
  AND p.stock > 0 
  AND (p.flash_sale_qty IS NULL OR p.flash_sale_qty > 0)
       ORDER BY p.discount_percent DESC LIMIT 20`
    );
    const data = rows.map(p => ({
  ...p,
  originalPrice: Number(p.price), 
  salePrice: Math.round(Number(p.price) * (1 - p.discount_percent / 100)),
  stockLeft: p.flash_sale_qty ?? p.stock,
  stockTotal: p.flash_sale_qty || p.stock
}));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        const { name, description, price, stock, image_url, category_id, brand, discount_percent, is_featured } = req.body;
        const [result] = await db.query(
            'UPDATE products SET name=?, description=?, price=?, stock=?, image_url=?, category_id=?, brand=?, discount_percent=?, is_featured=? WHERE id=?',
            [name, description, price, stock, image_url, category_id, brand, discount_percent || 0, is_featured || 0, req.params.id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
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

// - Lấy các filter options theo danh mục
const getFilterOptions = async (req, res) => {
    try {
        const { categoryId } = req.params;

        
        const ALLOWED_SPECS = {
            'CPU':       ['Socket', 'Số nhân'],
            'RAM':       ['Chuẩn', 'Dung lượng', 'Tốc độ'],
            'VGA':       ['VRAM', 'GPU', 'Loại VRAM'],
            'SSD':       ['Dung lượng', 'Chuẩn', 'Loại'],
            'Mainboard': ['Socket', 'Chipset', 'Form Factor', 'Chuẩn RAM'],
        };

        // Lấy tên danh mục
        const [[cat]] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        const allowedSpecs = cat ? (ALLOWED_SPECS[cat.name] || []) : [];

        if (allowedSpecs.length === 0) {
            // Danh mục không có filter đặc biệt → chỉ trả brands
            const [brands] = await db.query(
                'SELECT DISTINCT brand FROM products WHERE category_id = ? AND brand IS NOT NULL ORDER BY brand',
                [categoryId]
            );
            return res.json({ success: true, data: { brands: brands.map(b => b.brand), specs: {} } });
        }

        const placeholders = allowedSpecs.map(() => '?').join(',');
        const [rows] = await db.query(`
            SELECT ps.spec_name, ps.spec_value, COUNT(*) as count
            FROM product_specifications ps
            JOIN products p ON p.id = ps.product_id
            WHERE p.category_id = ? AND ps.spec_name IN (${placeholders})
            GROUP BY ps.spec_name, ps.spec_value
            ORDER BY ps.spec_name, count DESC, ps.spec_value
        `, [categoryId, ...allowedSpecs]);

        // Nhóm theo spec_name, giữ đúng thứ tự trong ALLOWED_SPECS
        const filters = {};
        allowedSpecs.forEach(name => { filters[name] = []; });
        rows.forEach(row => {
            filters[row.spec_name].push({ value: row.spec_value, count: row.count });
        });
        // Xóa spec nào không có giá trị
        Object.keys(filters).forEach(k => { if (filters[k].length === 0) delete filters[k]; });

        // Lấy brands
        const [brands] = await db.query(
            'SELECT DISTINCT brand FROM products WHERE category_id = ? AND brand IS NOT NULL ORDER BY brand',
            [categoryId]
        );

        res.json({
            success: true,
            data: {
                brands: brands.map(b => b.brand),
                specs: filters
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
// POST /api/products/flash-sale  — set giảm giá theo giờ cho nhiều sản phẩm
const setFlashSale = async (req, res) => {
  try {
    const { items, durationHours } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: 'Thiếu danh sách sản phẩm' });
    if (!durationHours || durationHours < 1)
      return res.status(400).json({ success: false, message: 'Thời gian ít nhất 1 giờ' });

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // Bước 1: Tắt toàn bộ sale cũ
    await db.query(
      `UPDATE products SET discount_percent = 0, discount_expires_at = NULL WHERE discount_percent > 0`
    );

    // Bước 2: Validate rồi set sale mới
    for (const { productId, saleQty, discountPercent } of items) {
      if (!discountPercent || discountPercent < 1 || discountPercent > 99)
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ID ${productId}: % giảm (${discountPercent}) không hợp lệ (1-99)`
        });

      const [[product]] = await db.query('SELECT stock FROM products WHERE id = ?', [productId]);
      if (!product) continue;

      if (saleQty > product.stock)
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ID ${productId}: số lượng sale (${saleQty}) vượt tồn kho (${product.stock})`
        });

      await db.query(
  'UPDATE products SET discount_percent = ?, discount_expires_at = ?, flash_sale_qty = ? WHERE id = ?',
  [discountPercent, expiresAt, saleQty, productId]
);
    }

    res.json({
      success: true,
      message: `Flash sale đã bắt đầu trong ${durationHours} giờ cho ${items.length} sản phẩm!`
    });

  } catch (error) {
    console.error('Flash sale error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductSpecs, getFilterOptions,getFeaturedProducts, getOnSaleProducts, setFlashSale };