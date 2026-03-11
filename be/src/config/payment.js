const crypto = require('crypto');

// VNPay Configuration
const vnpayConfig = {
    vnpUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', // Sandbox
    // vnpUrl: 'https://payment.vnpayment.vn/vpcpay.html', // Production
    vnpApiUrl: 'https://sandbox.vnpayment.vn/merchant_webapi/merchant.html', // Sandbox
    // vnpApiUrl: 'https://api.vnpayment.vn/merchant_webapi/merchant.html', // Production
    tmnCode: process.env.VNPAY_TMN_CODE,
    secretKey: process.env.VNPAY_SECRET_KEY,
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment-callback'
};

/**
 * Hàm tạo URL thanh toán VNPay
 * @param {Object} orderData - Dữ liệu đơn hàng
 * @returns {string} URL thanh toán VNPay
 */
const createVNPayUrl = (orderData) => {
    const {orderId, amount, orderDescription, clientIp} = orderData;

    const date = new Date();
    const createDate = date.getFullYear() +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        ('0' + date.getDate()).slice(-2) +
        ('0' + date.getHours()).slice(-2) +
        ('0' + date.getMinutes()).slice(-2) +
        ('0' + date.getSeconds()).slice(-2);

    // Tạo params
    const params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderDescription || `Thanh toan don hang ${orderId}`,
        vnp_OrderType: 'other',
        vnp_Amount: amount * 100, // VNPay tính bằng đơn vị nhỏ nhất (1/100 VND)
        vnp_ReturnUrl: vnpayConfig.returnUrl,
        vnp_IpAddr: clientIp || '127.0.0.1',
        vnp_CreateDate: createDate
    };

    // Sắp xếp theo thứ tự alphabet
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    // Tạo query string
    let queryString = '';
    const keys = Object.keys(sortedParams);
    for (let i = 0; i < keys.length; i++) {
        if (i > 0) queryString += '&';
        queryString += `${keys[i]}=${encodeURIComponent(String(sortedParams[keys[i]]))}`;
    }

    // Tạo secure hash
    const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
    const signed = hmac.update(Buffer.from(queryString, 'utf-8')).digest('hex');

    // Tạo URL thanh toán
    return `${vnpayConfig.vnpUrl}?${queryString}&vnp_SecureHash=${signed}`;
};

/**
 * Hàm xác minh response từ VNPay
 * @param {Object} vnpParams - Response params từ VNPay
 * @returns {Object} {isValid: boolean, orderId: string, amount: number}
 */
const verifyVNPayResponse = (vnpParams) => {
    const secureHash = vnpParams.vnp_SecureHash;
    
    // Xóa secure hash khỏi params
    const params = {...vnpParams};
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    // Sắp xếp alphabet
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    // Tạo query string
    let queryString = '';
    const keys = Object.keys(sortedParams);
    for (let i = 0; i < keys.length; i++) {
        if (i > 0) queryString += '&';
        queryString += `${keys[i]}=${encodeURIComponent(String(sortedParams[keys[i]]))}`;
    }

    // Tạo secure hash
    const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
    const signed = hmac.update(Buffer.from(queryString, 'utf-8')).digest('hex');

    // Kiểm tra hash
    const isValid = signed === secureHash;

    return {
        isValid,
        orderId: vnpParams.vnp_TxnRef,
        amount: parseInt(vnpParams.vnp_Amount) / 100,
        responseCode: vnpParams.vnp_ResponseCode,
        transactionNo: vnpParams.vnp_TransactionNo,
        bankCode: vnpParams.vnp_BankCode
    };
};

module.exports = {
    vnpayConfig,
    createVNPayUrl,
    verifyVNPayResponse
};
