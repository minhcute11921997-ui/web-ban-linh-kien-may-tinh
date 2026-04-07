const { VNPay, ignoreLogger, ProductCode, VnpLocale } = require('vnpay');

const vnpay = new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE,
    secureSecret: process.env.VNPAY_HASH_SECRET,
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true,
    enableLog: false,
    loggerFn: ignoreLogger,
});

const createVNPayUrl = (orderData) => {
    const { orderId, amount, clientIp } = orderData;

    const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: (clientIp === '::1' ? '127.0.0.1' : clientIp) || '127.0.0.1',
        vnp_TxnRef: String(orderId),
        vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay-callback',
        vnp_Locale: VnpLocale.VN,
    });

    console.log('=== FULL PAYMENT URL ===');
    console.log(paymentUrl);
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