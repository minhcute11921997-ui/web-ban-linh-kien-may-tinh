const ProductTable = ({
  products,
  getCategoryName,
  onEdit,
  onDelete,
  onStopSale,
  onToggleActive,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            {["#","Tên sản phẩm","Danh mục","Thương hiệu","Giá","Tồn kho","Giảm giá","Trạng thái","Thao tác"].map(
              (h) => (
                <th key={h} className="text-left px-6 py-3 font-medium">{h}</th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.id}
              className={`border-t border-gray-50 transition-colors ${
                p.is_active === 0
                  ? "opacity-40 bg-gray-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <td className="px-6 py-3 text-gray-400">{p.id}</td>
              <td className="px-6 py-3 font-medium text-gray-800 max-w-xs truncate">{p.name}</td>
              <td className="px-6 py-3 text-gray-500">{getCategoryName(p.category_id)}</td>
              <td className="px-6 py-3 text-gray-500">{p.brand || "—"}</td>
              <td className="px-6 py-3 text-blue-600 font-semibold">
                {Number(p.price).toLocaleString("vi-VN")}₫
              </td>
              <td className="px-6 py-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    p.stock > 10
                      ? "bg-green-100 text-green-700"
                      : p.stock > 0
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {p.stock === 0 ? "Hết hàng" : p.stock}
                </span>
              </td>
              <td className="px-6 py-3">
                {p.discount_percent > 0 &&
                (!p.discount_expires_at ||
                  new Date(p.discount_expires_at) > new Date()) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-600">
                      -{p.discount_percent}%
                    </span>
                    <button
                      onClick={() => onStopSale(p)}
                      className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      Tắt
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="px-6 py-3">
                <button
                  onClick={() => onToggleActive(p)}
                  className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                    p.is_active !== 0
                      ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                      : "bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700"
                  }`}
                >
                  {p.is_active !== 0 ? "Đang bán" : "Đã tắt"}
                </button>
              </td>
              <td className="px-6 py-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => onEdit(p)}
                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                Chưa có sản phẩm nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default ProductTable;