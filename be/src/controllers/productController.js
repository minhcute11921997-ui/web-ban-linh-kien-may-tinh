const Product = require('../models/Product');  
const Category = require('../models/Category'); 
// LẤY TẤT CẢ sản phẩm 
exports.getAllProducts = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 10 } = req.query; // Lấy tham số từ URL

        const filter = {}; // Bộ lọc, mặc định lấy tất cả

        // Nếu có tham số search → tìm sản phẩm có tên chứa từ khoá (không phân biệt hoa thường)
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        // Nếu có tham số category → lọc theo danh mục
        if (category) {
            filter.category = category;
        }

        const skip = (page - 1) * limit; // Tính số document cần bỏ qua để phân trang

        // Lấy sản phẩm theo bộ lọc, populate để lấy thông tin danh mục kèm theo
        const products = await Product.find(filter)
            .populate('category', 'name') // Thay category ID bằng tên danh mục
            .skip(skip)                   // Bỏ qua các trang trước
            .limit(Number(limit));        // Giới hạn số sản phẩm mỗi trang

        const total = await Product.countDocuments(filter); // Đếm tổng số sản phẩm

        res.json({
            success: true,
            data: products,
            pagination: {
                total,                          // Tổng số sản phẩm
                page: Number(page),             // Trang hiện tại
                totalPages: Math.ceil(total / limit) // Tổng số trang
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// LẤY 1 sản phẩm theo ID
exports.getProductById = async (req, res) => {
    try {
        // populate để lấy đầy đủ thông tin danh mục kèm theo sản phẩm
        const product = await Product.findById(req.params.id).populate('category', 'name');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// TẠO sản phẩm mới (admin)
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, image_url, category } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!name || !price || !category) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (tên, giá, danh mục)' });
        }

        // Kiểm tra danh mục có tồn tại không
        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
        }

        // Tạo sản phẩm mới và lưu vào MongoDB
        const newProduct = new Product({ name, description, price, stock, image_url, category });
        await newProduct.save();

        res.status(201).json({ success: true, message: 'Tạo sản phẩm thành công!', data: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// CẬP NHẬT sản phẩm (admin)
exports.updateProduct = async (req, res) => {
    try {
        const { name, description, price, stock, image_url, category } = req.body;

        // Tìm và cập nhật, { new: true } trả về document sau khi cập nhật
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { name, description, price, stock, image_url, category },
            { new: true }
        ).populate('category', 'name');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        res.json({ success: true, message: 'Cập nhật sản phẩm thành công!', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// XOÁ sản phẩm (admin)
exports.deleteProduct = async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id); // Tìm và xoá theo id

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        res.json({ success: true, message: 'Xoá sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
