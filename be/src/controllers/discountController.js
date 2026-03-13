const db = require('../config/db');

// Mock discount codes database (trong thực tế nên lưu vào database)
const DISCOUNT_CODES = {
  'SAVE10': { type: 'percent', value: 10, description: 'Giảm 10%', active: true },
  'SAVE20': { type: 'percent', value: 20, description: 'Giảm 20%', active: true },
  'SAVE50K': { type: 'amount', value: 50000, description: 'Giảm 50.000₫', active: true },
  'SAVE100K': { type: 'amount', value: 100000, description: 'Giảm 100.000₫', active: true },
};

exports.validateDiscount = async (req, res) => {
  try {
    const { code, totalPrice } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });
    }

    const discount = DISCOUNT_CODES[code.toUpperCase()];

    if (!discount) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không hợp lệ' });
    }

    if (!discount.active) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá không còn hiệu lực' });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = Math.floor(totalPrice * (discount.value / 100));
    } else if (discount.type === 'amount') {
      discountAmount = Math.min(discount.value, totalPrice);
    }

    res.json({
      success: true,
      data: {
        code: code.toUpperCase(),
        type: discount.type,
        value: discount.value,
        description: discount.description,
        discountAmount: discountAmount,
      }
    });
  } catch (error) {
    console.error('Lỗi validateDiscount:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getAvailableDiscounts = async (req, res) => {
  try {
    const available = Object.entries(DISCOUNT_CODES)
      .filter(([_, code]) => code.active)
      .map(([code, info]) => ({
        code,
        type: info.type,
        value: info.value,
        description: info.description,
      }));

    res.json({ success: true, data: available });
  } catch (error) {
    console.error('Lỗi getAvailableDiscounts:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
