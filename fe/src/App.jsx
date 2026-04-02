import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PrivateRoute from "./components/PrivateRoute";
import { useAuthInit } from "./hooks/useAuthInit";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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

function App() {
  useAuthInit();

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="discounts" element={<AdminDiscounts />} />
        </Route>

        {/* Customer routes */}
        <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
        <Route path="/login" element={<CustomerLayout><LoginPage /></CustomerLayout>} />
        <Route path="/register" element={<CustomerLayout><RegisterPage /></CustomerLayout>} />
        <Route path="/products/:id" element={<CustomerLayout><ProductDetail /></CustomerLayout>} />
        <Route path="/cart" element={<CustomerLayout><PrivateRoute><CartPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/checkout" element={<CustomerLayout><PrivateRoute><CheckoutPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/payment-success" element={<CustomerLayout><PrivateRoute><PaymentSuccessPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/payment-callback" element={<CustomerLayout><PrivateRoute><PaymentSuccessPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/orders" element={<CustomerLayout><PrivateRoute><OrdersPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/orders/:id" element={<CustomerLayout><PrivateRoute><OrderDetailPage /></PrivateRoute></CustomerLayout>} />
        <Route path="/profile" element={<CustomerLayout><PrivateRoute><ProfilePage /></PrivateRoute></CustomerLayout>} />


        <Route path="*" element={<CustomerLayout><NotFoundPage /></CustomerLayout>} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;