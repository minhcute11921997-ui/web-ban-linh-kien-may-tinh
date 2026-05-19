const { VNPay, ignoreLogger, ProductCode, VnpLocale } = require('vnpay');

const formatVNPayDate = (date = new Date()) => {
    return Number(date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0') +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') +
        String(date.getSeconds()).padStart(2, '0'));
};

const vnpay = new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE,
    secureSecret: process.env.VNPAY_HASH_SECRET || process.env.VNPAY_SECRET_KEY,
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true,
    enableLog: false,
    loggerFn: ignoreLogger,
});

const createVNPayUrl = (orderData) => {
    const { orderId, amount, orderDescription, clientIp } = orderData;

    const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: (clientIp === '::1' ? '127.0.0.1' : clientIp) || '127.0.0.1',
        vnp_TxnRef: String(orderId),
        vnp_OrderInfo: orderDescription || `Thanh toan don hang ${orderId}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay-callback',
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: formatVNPayDate()
    });

    return paymentUrl;
};

const verifyVNPayResponse = (vnpParams) => {
    const isValid = vnpay.verifyReturnUrl(vnpParams);
    return {
        isValid: isValid.isVerified,
        orderId: vnpParams.vnp_TxnRef,
        amount: parseInt(vnpParams.vnp_Amount) / 100,
        responseCode: vnpParams.vnp_ResponseCode,
        transactionNo: vnpParams.vnp_TransactionNo,
        bankCode: vnpParams.vnp_BankCode
    };
};

module.exports = {
    vnpayConfig: { tmnCode: process.env.VNPAY_TMN_CODE },
    createVNPayUrl,
    verifyVNPayResponse
};
