const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });

        const token = authHeader.split(' ')[1];
        if (!token)
            return res.status(401).json({ success: false, message: 'Token không hợp lệ' });

        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError')
            return res.status(401).json({ success: false, message: 'Token hết hạn' });
        if (error.name === 'JsonWebTokenError')
            return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
        return res.status(500).json({ success: false, message: 'Lỗi xác thực' });
    }
};

exports.verifyAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền truy cập' });
    next();
};