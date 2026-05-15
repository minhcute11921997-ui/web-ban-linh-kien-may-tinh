const db = require("../config/db");

const getAllProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy, sortOrder, specs } =
      req.query;

    let query =
      "SELECT DISTINCT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id";
    const params = [];
    const specFilters = specs ? JSON.parse(specs) : {};

    Object.entries(specFilters).forEach(([specName, specValue], index) => {
      query += ` INNER JOIN product_specifications ps${index} ON ps${index}.product_id = p.id AND ps${index}.spec_name = ? AND ps${index}.spec_value = ?`;
      params.push(specName, specValue);
    });

    const isAdminView = req.query.adminView === "true" && req.user?.role === "admin";
    query += isAdminView ? " WHERE 1=1" : " WHERE p.is_active = 1";

    if (search) {
      query += " AND p.name LIKE ?";
      params.push(`%${search}%`);
    }
    if (category) {
      query += " AND p.category_id = ?";
      params.push(category);
    }
    if (req.query.brand) {
      query += " AND p.brand = ?";
      params.push(req.query.brand);
    }
    if (minPrice) {
      query += " AND p.price >= ?";
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      query += " AND p.price <= ?";
      params.push(Number(maxPrice));
    }

    const allowedSort = ["price", "name", "created_at", "id"];
    const allowedOrder = ["ASC", "DESC"];
    const sort = allowedSort.includes(sortBy) ? sortBy : "id";
    const order = allowedOrder.includes(sortOrder?.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";
    query += ` ORDER BY p.${sort} ${order}`;

    const countQuery = query
      .replace(
        /^SELECT DISTINCT p\.\*, c\.name as category_name/,
        "SELECT COUNT(DISTINCT p.id) as total"
      )
      .replace(/ ORDER BY p\.\w+ (ASC|DESC)$/, "");
    const [[{ total }]] = await db.query(countQuery, params);

    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [products] = await db.query(query, params);

    res.json({
      success: true,
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[getAllProducts]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    const product = rows[0];
    if (product.specifications) {
      try {
        product.specifications = JSON.parse(product.specifications);
      } catch (_) {}
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("[getProductById]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      WHERE p.stock > 0 AND p.is_active = 1
      GROUP BY p.id
      ORDER BY total_sold DESC, p.id DESC
      LIMIT 8
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[getFeaturedProducts]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOnSaleProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.discount_percent > 0
         AND p.stock > 0
         AND p.is_active = 1
         AND (p.flash_sale_qty IS NULL OR p.flash_sale_qty > 0)
         AND (p.discount_expires_at IS NULL OR p.discount_expires_at > NOW())
       ORDER BY p.discount_percent DESC
       LIMIT 20`
    );

    const data = rows.map((product) => ({
      ...product,
      originalPrice: Number(product.price),
      salePrice: Math.round(
        Number(product.price) * (1 - product.discount_percent / 100)
      ),
      stockLeft: product.flash_sale_qty ?? product.stock,
      stockTotal: product.flash_sale_qty || product.stock,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("[getOnSaleProducts]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, image_url, category_id, brand } =
      req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Thieu thong tin bat buoc",
      });
    }

    const [result] = await db.query(
      "INSERT INTO products (name, description, price, stock, image_url, category_id, brand) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, description, price, stock, image_url, category_id, brand]
    );

    res.status(201).json({
      success: true,
      message: "Tao san pham thanh cong!",
      productId: result.insertId,
    });
  } catch (error) {
    console.error("[createProduct]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      image_url,
      category_id,
      brand,
      discount_percent,
      discount_expires_at,
      flash_sale_qty,
      is_featured,
    } = req.body;

    const discountPct = discount_percent || 0;
    const expiresAt = discountPct > 0 ? discount_expires_at || null : null;
    const flashQty = discountPct > 0 ? flash_sale_qty ?? null : null;
    const [result] = await db.query(
      "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ?, brand = ?, discount_percent = ?, discount_expires_at = ?, flash_sale_qty = ?, is_featured = ? WHERE id = ?",
      [
        name,
        description,
        price,
        stock,
        image_url,
        category_id,
        brand,
        discountPct,
        expiresAt,
        flashQty,
        is_featured || 0,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    res.json({ success: true, message: "Cap nhat san pham thanh cong!" });
  } catch (error) {
    console.error("[updateProduct]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    res.json({ success: true, message: "Xoa san pham thanh cong!" });
  } catch (error) {
    console.error("[deleteProduct]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const getProductSpecs = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT spec_name, spec_value FROM product_specifications WHERE product_id = ? ORDER BY id",
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[getProductSpecs]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const allowedSpecsByCategory = {
      RAM: ["Chuẩn", "Dung lượng", "Tốc độ"],
      CPU: ["Socket", "Số nhân"],
      VGA: ["VRAM", "GPU", "Loại VRAM"],
      SSD: ["Dung lượng", "Chuẩn", "Loại"],
      Mainboard: ["Socket", "Chipset", "Form Factor", "Chuẩn RAM"],
    };

    const [[category]] = await db.query("SELECT name FROM categories WHERE id = ?", [
      categoryId,
    ]);
    const allowedSpecs = category
      ? allowedSpecsByCategory[category.name] || []
      : [];

    const [brands] = await db.query(
      "SELECT DISTINCT brand FROM products WHERE category_id = ? AND brand IS NOT NULL ORDER BY brand",
      [categoryId]
    );

    if (allowedSpecs.length === 0) {
      return res.json({
        success: true,
        data: { brands: brands.map((brand) => brand.brand), specs: {} },
      });
    }

    const placeholders = allowedSpecs.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT ps.spec_name, ps.spec_value, COUNT(*) as count
       FROM product_specifications ps
       JOIN products p ON p.id = ps.product_id
       WHERE p.category_id = ? AND ps.spec_name IN (${placeholders})
       GROUP BY ps.spec_name, ps.spec_value
       ORDER BY ps.spec_name, count DESC, ps.spec_value`,
      [categoryId, ...allowedSpecs]
    );

    const filters = {};
    allowedSpecs.forEach((name) => {
      filters[name] = [];
    });
    rows.forEach((row) => {
      filters[row.spec_name].push({
        value: row.spec_value,
        count: row.count,
      });
    });
    Object.keys(filters).forEach((key) => {
      if (filters[key].length === 0) delete filters[key];
    });

    res.json({
      success: true,
      data: {
        brands: brands.map((brand) => brand.brand),
        specs: filters,
      },
    });
  } catch (error) {
    console.error("[getFilterOptions]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const setFlashSale = async (req, res) => {
  try {
    const { items, durationHours } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Thieu danh sach san pham",
      });
    }
    if (!durationHours || durationHours < 1) {
      return res.status(400).json({
        success: false,
        message: "Thoi gian it nhat 1 gio",
      });
    }

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    await db.query(
      `UPDATE products
       SET discount_percent = 0,
           discount_expires_at = NULL,
           flash_sale_qty = NULL
       WHERE discount_percent > 0`
    );

    for (const { productId, saleQty, discountPercent } of items) {
      if (!discountPercent || discountPercent < 1 || discountPercent > 99) {
        return res.status(400).json({
          success: false,
          message: `San pham ID ${productId}: phan tram giam khong hop le`,
        });
      }

      const [[product]] = await db.query(
        "SELECT stock FROM products WHERE id = ?",
        [productId]
      );
      if (!product) continue;

      if (saleQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `San pham ID ${productId}: so luong sale vuot ton kho`,
        });
      }

      await db.query(
        "UPDATE products SET discount_percent = ?, discount_expires_at = ?, flash_sale_qty = ? WHERE id = ?",
        [discountPercent, expiresAt, saleQty, productId]
      );
    }

    res.json({
      success: true,
      message: `Flash sale da bat dau trong ${durationHours} gio cho ${items.length} san pham!`,
    });
  } catch (error) {
    console.error("[setFlashSale]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

const toggleActive = async (req, res) => {
  try {
    const [[product]] = await db.query(
      "SELECT is_active FROM products WHERE id = ?",
      [req.params.id]
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    const newStatus = product.is_active ? 0 : 1;
    await db.query("UPDATE products SET is_active = ? WHERE id = ?", [
      newStatus,
      req.params.id,
    ]);

    res.json({
      success: true,
      message: newStatus ? "Da bat san pham!" : "Da tat san pham!",
      is_active: newStatus,
    });
  } catch (error) {
    console.error("[toggleActive]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductSpecs,
  getFilterOptions,
  getFeaturedProducts,
  getOnSaleProducts,
  setFlashSale,
  toggleActive,
};
