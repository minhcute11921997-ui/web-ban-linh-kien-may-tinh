import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
    <h2 className="text-2xl font-semibold text-gray-700 mb-2">Trang không tồn tại</h2>
    <p className="text-gray-500 mb-6">Trang bạn đang tìm kiếm đã bị xóa hoặc chưa được tạo.</p>
    <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
      Về trang chủ
    </Link>
  </div>
);

export default NotFoundPage;