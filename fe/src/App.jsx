import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
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
import bannerLeft from "./assets/banner-left.png";
import bannerRight from "./assets/banner-right.png";

const CustomerLayout = ({ children }) => (
  <>
    <Navbar />
    <div className="min-h-screen bg-gray-50">
      <div className="flex gap-3 px-4 py-6 max-w-screen-2xl mx-auto">
        <div className="w-36 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <a href="/" className="block rounded-xl overflow-hidden shadow hover:opacity-90 hover:scale-[1.02] transition-all duration-200">
              <img src={bannerLeft} alt="Banner trái" className="w-full h-auto object-cover" />
            </a>
          </div>
        </div>
        <main className="flex-1 min-w-0">{children}</main>
        <div className="w-36 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <a href="/" className="block rounded-xl overflow-hidden shadow hover:opacity-90 hover:scale-[1.02] transition-all duration-200">
              <img src={bannerRight} alt="Banner phải" className="w-full h-auto object-cover" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </>
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
            <PrivateRoute adminOnly={true}>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route path="categories" element={<AdminCategories />} />
<Route path="users" element={<AdminUsers />} /> 
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="revenue" element={<AdminRevenue />} /> {/* ✅ Thêm mới */}
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
      </Routes>
        <Route path="*" element={<CustomerLayout><NotFoundPage /></CustomerLayout>} />
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;