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
  const { name } = req.body;
  try {
    // Kiểm tra trùng tên
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM categories WHERE name = ?", [name]
    );
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: "Danh mục này đã tồn tại!"
      });
    }

    await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
    res.json({ success: true, message: "Thêm danh mục thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
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
  const { id } = req.params;
  try {
    // Kiểm tra có sản phẩm nào đang dùng không
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id]
    );

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa! Danh mục này đang có ${count} sản phẩm.`
      });
    }

    await db.query("DELETE FROM categories WHERE id = ?", [id]);
    res.json({ success: true, message: "Đã xóa danh mục!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};
