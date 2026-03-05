const Category = require('../models/Category'); 

// LẤY TẤT CẢ danh mục
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find(); // Lấy toàn bộ danh mục trong collection
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// LẤY 1 danh mục theo ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id); // Tìm theo _id của MongoDB
        if (!category) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// TẠO danh mục mới 
exports.createCategory = async (req, res) => {
    try {
        const { name, description, image_url } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
        }

        // Tạo document mới và lưu vào MongoDB
        const newCategory = new Category({ name, description, image_url });
        await newCategory.save();

        res.status(201).json({ success: true, message: 'Tạo danh mục thành công!', data: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// CẬP NHẬT danh mục 
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, image_url } = req.body;

        // Tìm theo id và cập nhật, { new: true } để trả về document sau khi cập nhật
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, image_url },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }

        res.json({ success: true, message: 'Cập nhật thành công!', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// XOÁ danh mục 
exports.deleteCategory = async (req, res) => {
    try {
        const deleted = await Category.findByIdAndDelete(req.params.id); // Tìm và xoá theo id

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }

        res.json({ success: true, message: 'Xoá danh mục thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
