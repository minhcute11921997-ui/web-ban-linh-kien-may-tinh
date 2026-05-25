import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PrivateRoute from "./components/PrivateRoute";
import { useAuthInit } from "./hooks/useAuthInit";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import ProductDetail from "./pages/ProductDetail";
import OrderDetailPage from "./pages/OrderDetailPage";
import CustomerLayout from "./components/CustomerLayout";
import NotFoundPage from "./pages/NotFoundPage";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminBanners from "./pages/admin/AdminBanners";

const adminRoles = ["admin", "staff"];
const ownerRoles = ["admin"];
const customerRoles = ["customer", "user"];

const AdminOnly = ({ children }) => (
  <PrivateRoute allowedRoles={ownerRoles}>{children}</PrivateRoute>
);

function App() {
  useAuthInit();

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={adminRoles}>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="categories" element={<AdminOnly><AdminCategories /></AdminOnly>} />
          <Route path="users" element={<AdminOnly><AdminUsers /></AdminOnly>} />
          <Route path="products" element={<AdminOnly><AdminProducts /></AdminOnly>} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="discounts" element={<AdminOnly><AdminDiscounts /></AdminOnly>} />
          <Route path="banners" element={<AdminOnly><AdminBanners /></AdminOnly>} />
        </Route>

        {/* Customer routes */}
        <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
        <Route path="/login" element={<CustomerLayout><LoginPage /></CustomerLayout>} />
        <Route path="/register" element={<CustomerLayout><RegisterPage /></CustomerLayout>} />
        <Route path="/verify-email" element={<CustomerLayout><VerifyEmailPage /></CustomerLayout>} />
        <Route path="/products/:id" element={<CustomerLayout><ProductDetail /></CustomerLayout>} />
        <Route path="/cart" element={<CustomerLayout><PrivateRoute allowedRoles={customerRoles}><CartPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/checkout" element={<CustomerLayout><PrivateRoute allowedRoles={customerRoles}><CheckoutPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/payment-success" element={<CustomerLayout><PrivateRoute allowedRoles={customerRoles}><PaymentSuccessPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/payment-callback" element={<CustomerLayout><PrivateRoute allowedRoles={customerRoles}><PaymentSuccessPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/orders" element={<CustomerLayout><PrivateRoute allowedRoles={customerRoles}><OrdersPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/orders/:id" element={<CustomerLayout><PrivateRoute allowedRoles={customerRoles}><OrderDetailPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/profile" element={<CustomerLayout><PrivateRoute><ProfilePage /></PrivateRoute></CustomerLayout>} />


        <Route path="*" element={<CustomerLayout><NotFoundPage /></CustomerLayout>} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;
