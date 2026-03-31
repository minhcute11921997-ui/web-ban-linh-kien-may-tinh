import { useState } from "react";
import { toast } from "react-toastify";

const FlashSaleModal = ({ products, getCategoryName, onClose, onSubmit }) => {
  const [selectedItems, setSelectedItems] = useState(() => {
    const init = {};
    products.forEach((p) => {
      init[p.id] = { checked: false, qty: 1, discount: 10 };
    });
    return init;
  });
  const [discountPercent, setDiscountPercent] = useState(10);
  const [durationHours, setDurationHours] = useState(24);
  const [submitting, setSubmitting] = useState(false);

  const toggleCheck = (id, checked) =>
    setSelectedItems((prev) => ({ ...prev, [id]: { ...prev[id], checked } }));

  const changeQty = (id, val, maxStock) => {
    const qty = Math.min(Math.max(1, Number(val)), maxStock);
    setSelectedItems((prev) => ({ ...prev, [id]: { ...prev[id], qty } }));
  };

  const changeDiscount = (id, val) => {
    const discount = Math.min(99, Math.max(1, Number(val)));
    setSelectedItems((prev) => ({ ...prev, [id]: { ...prev[id], discount } }));
  };

  const applyDiscountToAll = () => {
    if (!discountPercent || discountPercent < 1)
      return toast.warning("Nhập % giảm hợp lệ trước!");
    setSelectedItems((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], discount: discountPercent };
      });
      return next;
    });
    toast.info(`Đã áp dụng ${discountPercent}% cho tất cả`);
  };

  const selectedCount = Object.values(selectedItems).filter((i) => i.checked).length;
  const expiresAt = new Date(
    Date.now() + (durationHours || 0) * 3600000
  ).toLocaleString("vi-VN");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">🏷️ Thiết lập Flash Sale</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
          >×</button>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-gray-100 bg-orange-50 flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Giảm giá chung (%)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number" min="1" max="99"
                value={discountPercent === 0 ? "" : discountPercent}
                onChange={(e) =>
                  setDiscountPercent(
                    e.target.value === "" ? 0 : Math.min(99, Math.max(1, Number(e.target.value)))
                  )
                }
                onBlur={() => { if (!discountPercent || discountPercent < 1) setDiscountPercent(1); }}
                className="w-24 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <button
                type="button"
                onClick={applyDiscountToAll}
                className="text-xs bg-orange-100 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-200 cursor-pointer font-medium"
              >
                Áp dụng tất cả
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Thời gian (giờ)</label>
            <input
              type="number" min="1" max="720"
              value={durationHours === 0 ? "" : durationHours}
              onChange={(e) =>
                setDurationHours(
                  e.target.value === "" ? 0 : Math.min(720, Math.max(1, Number(e.target.value)))
                )
              }
              onBlur={() => { if (!durationHours || durationHours < 1) setDurationHours(1); }}
              className="w-28 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>
          <div className="text-sm text-orange-600 font-medium pb-0.5">
            Kết thúc lúc: <span className="font-bold">{expiresAt}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="py-3 text-left w-8">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                    checked={
                      products.length > 0 &&
                      products.every((p) => selectedItems[p.id]?.checked)
                    }
                    onChange={(e) => {
                      const next = {};
                      products.forEach((p) => {
                        next[p.id] = { ...selectedItems[p.id], checked: e.target.checked };
                      });
                      setSelectedItems(next);
                    }}
                  />
                </th>
                <th className="py-3 text-left">Sản phẩm</th>
                <th className="py-3 text-right">Giá gốc</th>
                <th className="py-3 text-right">Tồn kho</th>
                <th className="py-3 text-right w-28">SL sale</th>
                <th className="py-3 text-right w-24">% Giảm</th>
                <th className="py-3 text-right">Giá sau giảm</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const item = selectedItems[p.id] || { checked: false, qty: 1, discount: 10 };
                const salePrice = Math.round(Number(p.price) * (1 - (item.discount || 0) / 100));
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-50 transition-colors ${
                      p.is_active === 0 || p.stock === 0
                        ? "opacity-50 bg-gray-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3">
                      <input
                        type="checkbox" checked={item.checked}
                        onChange={(e) => toggleCheck(p.id, e.target.checked)}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 truncate max-w-[180px]">{p.name}</span>
                        {p.discount_percent > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-500 rounded-full">
                            -{p.discount_percent}% đang sale
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {p.brand || "—"} · {getCategoryName(p.category_id)}
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-500 whitespace-nowrap">
                      {Number(p.price).toLocaleString("vi-VN")}₫
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.stock > 10 ? "bg-green-100 text-green-700"
                        : p.stock > 0 ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <input
                        type="number" min="1" max={p.stock}
                        value={item.qty === 0 ? "" : item.qty}
                        disabled={!item.checked}
                        onChange={(e) =>
                          e.target.value === ""
                            ? setSelectedItems((prev) => ({ ...prev, [p.id]: { ...prev[p.id], qty: 0 } }))
                            : changeQty(p.id, e.target.value, p.stock)
                        }
                        onBlur={() => {
                          if (!item.qty || item.qty < 1)
                            setSelectedItems((prev) => ({ ...prev, [p.id]: { ...prev[p.id], qty: 1 } }));
                        }}
                        className="w-20 border border-gray-200 px-2 py-1.5 rounded-lg text-sm text-center disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </td>
                    <td className="py-3 text-right">
                      <input
                        type="number" min="1" max="99"
                        value={item.discount === 0 ? "" : item.discount}
                        disabled={!item.checked}
                        onChange={(e) =>
                          e.target.value === ""
                            ? setSelectedItems((prev) => ({ ...prev, [p.id]: { ...prev[p.id], discount: 0 } }))
                            : changeDiscount(p.id, e.target.value)
                        }
                        onBlur={() => {
                          if (!item.discount || item.discount < 1)
                            setSelectedItems((prev) => ({ ...prev, [p.id]: { ...prev[p.id], discount: 1 } }));
                        }}
                        className="w-20 border border-gray-200 px-2 py-1.5 rounded-lg text-sm text-center disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </td>
                    <td className="py-3 text-right font-semibold whitespace-nowrap">
                      {item.checked ? (
                        <span className="text-orange-500">{salePrice.toLocaleString("vi-VN")}₫</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <div className="text-sm text-gray-500">
            Đã chọn:{" "}
            <strong className="text-orange-500 text-base">{selectedCount}</strong>{" "}
            / {products.length} sản phẩm
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="border border-gray-200 text-gray-600 px-5 py-2 rounded-xl text-sm hover:bg-white cursor-pointer"
            >
              Hủy
            </button>
            <button
              disabled={submitting || selectedCount === 0}
              onClick={() => onSubmit(selectedItems, durationHours, setSubmitting, onClose)}
              className="bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Đang xử lý..." : `Bắt đầu Flash Sale (${selectedCount})`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FlashSaleModal;