const crypto = require('crypto');
const qs = require('qs');

const vnpayConfig = {
    vnpUrl:    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnpApiUrl: 'https://sandbox.vnpayment.vn/merchant_webapi/merchant.html',
    tmnCode:   process.env.VNPAY_TMN_CODE,
    secretKey: process.env.VNPAY_HASH_SECRET,
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay-callback'
};

const createVNPayUrl = (orderData) => {
    const { orderId, amount, orderDescription, clientIp } = orderData;

    const date = new Date();
    const createDate = date.getFullYear() +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        ('0' + date.getDate()).slice(-2) +
        ('0' + date.getHours()).slice(-2) +
        ('0' + date.getMinutes()).slice(-2) +
        ('0' + date.getSeconds()).slice(-2);

    let params = {
        vnp_Version:    '2.1.0',
        vnp_Command:    'pay',
        vnp_TmnCode:    vnpayConfig.tmnCode,
        vnp_Locale:     'vn',
        vnp_CurrCode:   'VND',
        vnp_TxnRef:     String(orderId),
        vnp_OrderInfo:  orderDescription || `Thanh toan don hang ${orderId}`,
        vnp_OrderType:  'other',
        vnp_Amount:     amount * 100,
        vnp_ReturnUrl:  vnpayConfig.returnUrl,
        vnp_IpAddr:     clientIp || '127.0.0.1',
        vnp_CreateDate: createDate,
    };

    // Sắp xếp alphabet
    params = Object.keys(params)
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    const signData = qs.stringify(params, { encode: false });

    const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return `${vnpayConfig.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;
};

const verifyVNPayResponse = (vnpParams) => {
    const secureHash = vnpParams.vnp_SecureHash;

    let params = { ...vnpParams };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    // Sắp xếp alphabet
    params = Object.keys(params)
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

    const signData = qs.stringify(params, { encode: false });

    const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return {
        isValid:       signed === secureHash,
        orderId:       vnpParams.vnp_TxnRef,
        amount:        parseInt(vnpParams.vnp_Amount) / 100,
        responseCode:  vnpParams.vnp_ResponseCode,
        transactionNo: vnpParams.vnp_TransactionNo,
        bankCode:      vnpParams.vnp_BankCode
    };
};

module.exports = {
    vnpayConfig,
    createVNPayUrl,
    verifyVNPayResponse
};