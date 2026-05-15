const db = require("../config/db");

const getOrCreateCartId = async (userId) => {
  const [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [
    userId,
  ]);

  if (carts.length > 0) return carts[0].id;

  const [result] = await db.query("INSERT INTO cart (user_id) VALUES (?)", [
    userId,
  ]);
  return result.insertId;
};

exports.getCart = async (req, res) => {
  try {
    const cartId = await getOrCreateCartId(req.user.userId);
    const [items] = await db.query(
      `SELECT ci.id, ci.product_id, ci.quantity,
        p.name, p.image_url, p.stock,
        p.price AS original_price,
        p.discount_percent,
        CASE
          WHEN p.discount_percent > 0
            AND (p.discount_expires_at IS NULL OR p.discount_expires_at > NOW())
          THEN ROUND(p.price * (1 - p.discount_percent / 100))
          ELSE p.price
        END AS price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    const total = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    res.json({ success: true, data: { items, total } });
  } catch (error) {
    console.error("[getCart]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity ?? 1);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({
        success: false,
        message: "Thieu productId",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "So luong them vao gio phai la so nguyen lon hon 0",
      });
    }

    const [products] = await db.query(
      "SELECT id, stock FROM products WHERE id = ? AND is_active = 1",
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    const product = products[0];
    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "San pham da het hang",
        maxStock: 0,
      });
    }

    const cartId = await getOrCreateCartId(req.user.userId);
    const [existing] = await db.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cartId, productId]
    );

    const currentQty = existing[0]?.quantity ? Number(existing[0].quantity) : 0;
    const newTotalQty = currentQty + quantity;

    if (newTotalQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Chi con ${product.stock} san pham trong kho`,
        maxStock: product.stock,
        currentCartQty: currentQty,
      });
    }

    if (existing.length > 0) {
      await db.query(
        "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
        [newTotalQty, cartId, productId]
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
        [cartId, productId, quantity]
      );
    }

    res.json({ success: true, message: "Them vao gio hang thanh cong!" });
  } catch (error) {
    console.error("[addToCart]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "So luong phai la so nguyen lon hon 0",
      });
    }

    const [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [
      req.user.userId,
    ]);
    if (carts.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Khong co quyen thuc hien",
      });
    }

    const [cartItems] = await db.query(
      "SELECT product_id FROM cart_items WHERE id = ? AND cart_id = ?",
      [req.params.id, carts[0].id]
    );
    if (cartItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham trong gio",
      });
    }

    const [products] = await db.query(
      "SELECT stock FROM products WHERE id = ? AND is_active = 1",
      [cartItems[0].product_id]
    );
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "San pham khong ton tai",
      });
    }

    if (quantity > products[0].stock) {
      return res.status(400).json({
        success: false,
        message: `Chi con ${products[0].stock} san pham trong kho`,
        maxStock: products[0].stock,
      });
    }

    const [result] = await db.query(
      "UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?",
      [quantity, req.params.id, carts[0].id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham trong gio",
      });
    }

    res.json({ success: true, message: "Cap nhat gio hang thanh cong!" });
  } catch (error) {
    console.error("[updateCartItem]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [
      req.user.userId,
    ]);
    if (carts.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Khong co quyen thuc hien",
      });
    }

    const [result] = await db.query(
      "DELETE FROM cart_items WHERE id = ? AND cart_id = ?",
      [req.params.id, carts[0].id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham trong gio",
      });
    }

    res.json({ success: true, message: "Xoa san pham khoi gio thanh cong!" });
  } catch (error) {
    console.error("[removeFromCart]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const [carts] = await db.query("SELECT id FROM cart WHERE user_id = ?", [
      req.user.userId,
    ]);

    if (carts.length > 0) {
      await db.query("DELETE FROM cart_items WHERE cart_id = ?", [carts[0].id]);
    }

    res.json({ success: true, message: "Da xoa toan bo gio hang!" });
  } catch (error) {
    console.error("[clearCart]", error);
    res.status(500).json({
      success: false,
      message: "Loi server",
      error: error.message,
    });
  }
};
