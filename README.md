# 🛒 Web Bán Hàng Linh Kiện Máy Tính

Dự án web thương mại điện tử full-stack xây dựng với **React (Vite)** ở Frontend và **Node.js/Express** ở Backend, sử dụng **MySQL** làm cơ sở dữ liệu. Tích hợp thanh toán **VNPay**.

---

## 📁 Cấu Trúc Dự Án

```
web-/
├── be/                         # Backend (Node.js + Express)
│   ├── server.js               # Entry point, khởi động server & đăng ký routes
│   ├── package.json
│   ├── .env.example            # Mẫu biến môi trường
│   └── src/
│       ├── config/             # Cấu hình kết nối DB (MySQL)
│       ├── controllers/        # Logic xử lý nghiệp vụ
│       │   ├── authController.js
│       │   ├── cartController.js
│       │   ├── categoryController.js
│       │   ├── checkoutController.js
│       │   ├── dashboardController.js
│       │   ├── discountController.js
│       │   ├── orderController.js
│       │   ├── paymentController.js
│       │   ├── productController.js
│       │   ├── shippingController.js
│       │   └── userController.js
│       ├── middleware/
│       │   └── auth.js         # Middleware xác thực JWT
│       └── routes/             # Định nghĩa API routes
│           ├── auth.js         → /api/auth
│           ├── product.js      → /api/products
│           ├── category.js     → /api/categories
│           ├── cart.js         → /api/cart
│           ├── checkout.js     → /api/checkout
│           ├── order.js        → /api/orders
│           ├── payment.js      → /api/payments
│           ├── discount.js     → /api/discounts
│           ├── shipping.js     → /api/shipping
│           ├── user.js         → /api/users
│           └── dashboard.js    → /api/dashboard
│
└── fe/                         # Frontend (React 19 + Vite + Tailwind CSS)
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx            # Entry point React
        ├── App.jsx             # Routing chính
        ├── api/                # Axios API calls
        ├── components/         # Shared components
        ├── hooks/              # Custom React hooks
        ├── store/              # Zustand state management
        ├── assets/             # Ảnh, icon
        └── pages/
            ├── HomePage.jsx
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── ProductDetail.jsx
            ├── CartPage.jsx
            ├── CheckoutPage.jsx
            ├── OrdersPage.jsx
            ├── OrderDetailPage.jsx
            ├── PaymentSuccessPage.jsx
            ├── ProfilePage.jsx
            └── admin/          # Trang quản trị
```

---

## ⚙️ Yêu Cầu Hệ Thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MySQL** >= 8.x
- Git

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### 1. Clone repository

```bash
git clone https://github.com/minhcute11921997-ui/web-.git
cd web-
```

---

### 2. Cài đặt Backend

```bash
cd be
npm install
```

#### Tạo file `.env`

```bash
cp .env.example .env
```

Mở file `.env` và điền thông tin:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=ecommerce_db

# JWT
JWT_SECRET=your_jwt_secret_key_here

# VNPay (đăng ký tại https://sandbox.vnpayment.vn/devreg/)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_SECRET_KEY=your_secret_key
VNPAY_RETURN_URL=http://localhost:5000/api/payments/vnpay-callback

# URL frontend
FRONTEND_URL=http://localhost:5173

# Server
PORT=3000
```

#### Tạo database MySQL

Đăng nhập MySQL và tạo database:

```sql
CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Khởi động Backend

```bash
# Development (auto-reload với nodemon)
npm run dev

# Production
npm start
```

> Server chạy tại: `http://localhost:3000`

---

### 3. Cài đặt Frontend

Mở terminal mới:

```bash
cd fe
npm install
```

#### Tạo file `.env`

```bash
cp .env.example .env
```

Nội dung `.env` frontend:

```env
VITE_API_URL=http://localhost:3000
```

#### Khởi động Frontend

```bash
npm run dev
```

> Ứng dụng chạy tại: `http://localhost:5173`

---

## 📦 Tech Stack

### Backend
| Package | Phiên bản | Mục đích |
|---|---|---|
| express | ^5.2.1 | Web framework |
| mysql2 | ^3.16.2 | Kết nối MySQL |
| jsonwebtoken | ^9.0.3 | Xác thực JWT |
| bcryptjs | ^3.0.3 | Mã hoá mật khẩu |
| dotenv | ^17.2.3 | Quản lý biến môi trường |
| cors | ^2.8.6 | Cho phép cross-origin |
| nodemon | ^3.1.11 | Dev auto-reload |

### Frontend
| Package | Phiên bản | Mục đích |
|---|---|---|
| react | ^19.2.0 | UI framework |
| vite | ^7.3.1 | Build tool |
| tailwindcss | ^4.2.1 | CSS utility |
| react-router-dom | ^7.13.1 | Client-side routing |
| axios | ^1.13.5 | HTTP client |
| zustand | ^5.0.11 | State management |
| react-toastify | ^11.0.5 | Thông báo toast |
| recharts | ^3.8.0 | Biểu đồ thống kê |

---

## 🔌 API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập, nhận JWT |

### Products — `/api/products`
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/products` | Danh sách sản phẩm (có phân trang, tìm kiếm) |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| POST | `/api/products` | Thêm sản phẩm *(Admin)* |
| PUT | `/api/products/:id` | Cập nhật sản phẩm *(Admin)* |
| DELETE | `/api/products/:id` | Xoá sản phẩm *(Admin)* |

### Categories — `/api/categories`
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/categories` | Danh sách danh mục |
| POST | `/api/categories` | Thêm danh mục *(Admin)* |

### Cart — `/api/cart`
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/cart` | Lấy giỏ hàng của user |
| POST | `/api/cart` | Thêm sản phẩm vào giỏ |
| PUT | `/api/cart/:id` | Cập nhật số lượng |
| DELETE | `/api/cart/:id` | Xoá sản phẩm khỏi giỏ |

### Orders — `/api/orders`
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/orders` | Danh sách đơn hàng của user |
| GET | `/api/orders/:id` | Chi tiết đơn hàng |
| PUT | `/api/orders/:id/status` | Cập nhật trạng thái *(Admin)* |

### Payments — `/api/payments`
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/payments/vnpay` | Tạo URL thanh toán VNPay |
| GET | `/api/payments/vnpay-callback` | Callback sau thanh toán |

### Dashboard — `/api/dashboard` *(Admin)*
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/dashboard/stats` | Thống kê tổng quan |
| GET | `/api/dashboard/revenue` | Biểu đồ doanh thu |

### Discounts — `/api/discounts` *(Admin)*
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/discounts` | Danh sách mã giảm giá |
| POST | `/api/discounts` | Tạo mã giảm giá |

---

## 🔐 Xác Thực

Dự án sử dụng **JWT (JSON Web Token)**. Sau khi đăng nhập, client nhận được token và đính kèm vào header của mỗi request cần xác thực:

```
Authorization: Bearer <your_token>
```

Middleware `verifyToken` ở `be/src/middleware/auth.js` sẽ kiểm tra token trên các route được bảo vệ.

---

## 💳 Tích Hợp Thanh Toán VNPay

Dự án hỗ trợ thanh toán qua **VNPay sandbox**:

1. Đăng ký tài khoản sandbox tại: https://sandbox.vnpayment.vn/devreg/
2. Lấy `TMN_CODE` và `SECRET_KEY` điền vào `.env`
3. Đảm bảo `VNPAY_RETURN_URL` trỏ đúng về backend endpoint
4. Backend sẽ redirect về `FRONTEND_URL` sau khi xử lý callback

---

## ⚡ Tính Năng Nổi Bật

- ✅ Đăng ký / Đăng nhập với JWT
- ✅ Xem danh sách & chi tiết sản phẩm
- ✅ Giỏ hàng (thêm, sửa, xoá)
- ✅ Checkout & đặt hàng
- ✅ Thanh toán VNPay
- ✅ Quản lý đơn hàng
- ✅ Mã giảm giá (discount)
- ✅ Tính phí vận chuyển
- ✅ Trang Admin: quản lý sản phẩm, đơn hàng, danh mục, dashboard thống kê
- ✅ Tự động xoá flash sale hết hạn (cron job mỗi 60 giây)

---

## 🛠️ Scripts Hữu Ích

```bash
# Kiểm tra kết nối database
cd be && node test-db.js

# Build frontend cho production
cd fe && npm run build

# Preview bản build
cd fe && npm run preview

# Lint code frontend
cd fe && npm run lint
```

---

## 📝 Lưu Ý

- Không commit file `.env` lên Git (đã có trong `.gitignore`)
- Port mặc định: Backend `3000`, Frontend `5173`
- Đảm bảo MySQL đang chạy trước khi khởi động backend
- Để chạy đồng thời cả frontend và backend, mở **2 terminal riêng biệt**
