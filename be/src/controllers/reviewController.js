const db = require('../config/db');
const Joi = require('joi');

//Joi schemas 
const createSchema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    order_id: Joi.number().integer().positive().allow(null).optional(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().min(1).max(2000).required()
        .messages({
            'string.min': 'Vui lòng nhập nội dung đánh giá',
            'string.max': 'Bình luận tối đa 2000 ký tự',
        }),
});

const updateSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    comment: Joi.string().min(1).max(2000).optional(),
});



// GET /api/reviews/product/:productId

exports.getReviewsByProduct = async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        if (!Number.isInteger(productId) || productId <= 0)
            return res.status(400).json({ success: false, message: 'productId không hợp lệ' });

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM reviews WHERE product_id = ?',
            [productId]
        );

        const [rows] = await db.query(
            `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.full_name, u.avatar_url
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
            [productId, limit, offset]
        );

        const [[stats]] = await db.query(
            `SELECT 
         ROUND(AVG(rating), 1) AS avg_rating,
         COUNT(*) AS total_reviews,
         SUM(rating = 5) AS s5, SUM(rating = 4) AS s4,
         SUM(rating = 3) AS s3, SUM(rating = 2) AS s2,
         SUM(rating = 1) AS s1
       FROM reviews WHERE product_id = ?`,
            [productId]
        );

        return res.json({
            success: true,
            data: rows,
            stats,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// POST /api/reviews — tạo đánh giá mới

exports.createReview = async (req, res) => {
    try {
        // 1. Validate bằng Joi
        const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            const messages = error.details.map(d => d.message);
            return res.status(400).json({ success: false, message: messages[0], errors: messages });
        }

        const userId = req.user.userId;
        const { product_id, order_id, rating } = value;

        // 2. Sanitize comment bằng xss (lớp phòng thủ thứ 2)
        const comment = value.comment.trim();

        // 3. Kiểm tra đã mua hàng chưa nếu có order_id
        if (order_id) {
            const [[orderItem]] = await db.query(
                `SELECT oi.id FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.id = ? AND o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'`,
                [order_id, userId, product_id]
            );
            if (!orderItem)
                return res.status(403).json({
                    success: false,
                    message: 'Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao'
                });
        }

        // 4. Kiểm tra đã đánh giá chưa
        const [[existing]] = await db.query(
            'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
            [userId, product_id]
        );
        if (existing)
            return res.status(409).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này rồi' });

        // 5. Insert với prepared statement (chống SQL Injection)
        const [result] = await db.query(
            'INSERT INTO reviews (product_id, user_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [product_id, userId, order_id ?? null, rating, comment]
        );

        const [[newReview]] = await db.query(
            `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.full_name, u.avatar_url
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            data: newReview,
            message: 'Đánh giá thành công!'
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này rồi' });
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// PUT /api/reviews/:id — sửa đánh giá

exports.updateReview = async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        if (!Number.isInteger(reviewId) || reviewId <= 0)
            return res.status(400).json({ success: false, message: 'reviewId không hợp lệ' });

        const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            const messages = error.details.map(d => d.message);
            return res.status(400).json({ success: false, message: messages[0], errors: messages });
        }

        const userId = req.user.userId;

        const [[review]] = await db.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
        if (!review)
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        if (review.user_id !== userId)
            return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa đánh giá này' });

        const newRating = value.rating ?? review.rating;
        const newComment = value.comment ? value.comment.trim() : review.comment;

        await db.query(
            'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
            [newRating, newComment, reviewId]
        );

        const [[updated]] = await db.query(
            `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.full_name, u.avatar_url
       FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?`,
            [reviewId]
        );

        return res.json({ success: true, data: updated, message: 'Cập nhật đánh giá thành công' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// DELETE /api/reviews/:id

exports.deleteReview = async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        if (!Number.isInteger(reviewId) || reviewId <= 0)
            return res.status(400).json({ success: false, message: 'reviewId không hợp lệ' });

        const userId = req.user.userId;
        const userRole = req.user.role;

        const [[review]] = await db.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
        if (!review)
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        if (review.user_id !== userId && userRole !== 'admin')
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá đánh giá này' });

        await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        return res.json({ success: true, message: 'Đã xoá đánh giá' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// GET /api/reviews/check/:productId
exports.checkUserReview = async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        if (!Number.isInteger(productId) || productId <= 0)
            return res.status(400).json({ success: false, message: 'productId không hợp lệ' });

        const userId = req.user.userId;
        const [[review]] = await db.query(
            'SELECT id, rating, comment FROM reviews WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
        return res.json({ success: true, data: review || null });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};