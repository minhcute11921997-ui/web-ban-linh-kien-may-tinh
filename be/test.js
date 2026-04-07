require('dotenv').config();
const crypto = require('crypto');

const secret = process.env.VNPAY_HASH_SECRET;
console.log('Secret:', secret);
console.log('Secret length:', secret ? secret.length : 'UNDEFINED');

const signData = 'vnp_Amount=6409000000&vnp_Command=pay&vnp_CreateDate=20260408033112&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20112&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fpayments%2Fvnpay-callback&vnp_TmnCode=TLYXMQSF&vnp_TxnRef=112&vnp_Version=2.1.0';

const hmac = crypto.createHmac('sha512', secret);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

console.log('Hash tinh duoc:', signed);
console.log('Hash trong URL: 0dfc4aca239db467321a0dce4e309bbca64d350c255a0cdbc78000d0531283163a67803e126685cfe2214247f2cc3c7e39bf1921a106031aa5de5b5c79ae0efc');
console.log('Khop nhau?', signed === '0dfc4aca239db467321a0dce4e309bbca64d350c255a0cdbc78000d0531283163a67803e126685cfe2214247f2cc3c7e39bf1921a106031aa5de5b5c79ae0efc');