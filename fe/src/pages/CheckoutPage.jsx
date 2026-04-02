import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../api/config";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";
import { discountApi } from "../api/discountApi";
import { addressApi } from "../api/addressApi";
import { discountApi } from "../api/discountApi";
import AddressSelector from "../components/AddressSelector";

import {
  CreditCard, ShoppingBag, Truck, Tag, User, Phone, MapPin,
  FileText, Ticket, CheckCircle, ArrowLeft, Loader2, LogIn,
  PackageOpen, Star, ChevronDown, ChevronUp, Plus, X, Gift,
} from "lucide-react";

const labelCls = "flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2";
const inputCls = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { items, loading: cartLoading, fetchCart, selectedItems } = useCartStore();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [showAvailable, setShowAvailable] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [shippingFee, setShippingFee] = useState(0);

  /* ── Địa chỉ đã lưu ── */
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showSaved, setShowSaved] = useState(true);

  const calculateShippingFee = (address) => {
    if (!address.trim()) { setShippingFee(0); return; }
    const hanoi = ["hà nội", "ha noi", "hn", "hanoi", "hànội"];
    setShippingFee(hanoi.some(c => address.toLowerCase().includes(c)) ? 50000 : 100000);
  };

  useEffect(() => {
    if (appliedDiscount) {
      handleApplyDiscount(appliedDiscount.code);
    }
  }, [shippingFee]);

  useEffect(() => {
    if (!token) return;
    fetchCart();

    addressApi.getAll()
      .then(r => {
        const addrs = r.data.data || [];
        setSavedAddresses(addrs);
        const def = addrs.find(a => a.is_default) || addrs[0];
        if (def) {
          setSelectedAddrId(def.id);
          setCustomerName(def.receiver);
          setCustomerPhone(def.phone);
          setCustomerAddress(def.full_address);
          calculateShippingFee(def.full_address);
        }
      })
      .catch(() => { });

    getAvailableDiscounts()
      .then(r => setAvailableDiscounts(r.data.data || []))
      .catch(() => { });

  }, [token]);

  const cartItems = items.filter(item => selectedItems.includes(item.id));
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  /* ── Helpers địa chỉ ── */
  const handleSelectSaved = (addr) => {
    setSelectedAddrId(addr.id);
    setCustomerName(addr.receiver);
    setCustomerPhone(addr.phone);
    setCustomerAddress(addr.full_address);
    calculateShippingFee(addr.full_address);
  };

  const handleUseNew = () => {
    setSelectedAddrId(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setShippingFee(0);
  };

  /* ── Discount ── */
  const handleApplyDiscount = async (codeOverride) => {
    const code = (codeOverride || discountCode).trim().toUpperCase();
    if (!code) { toast.warning('Vui lòng nhập mã giảm giá'); return; }

    setDiscountLoading(true);
    try {
      const res = await validateDiscount(code, subtotal + shippingFee);
      const data = res.data.data;
      setAppliedDiscount({ ...data, code });
      setDiscountAmount(Number(data.discountAmount) || 0);
      setDiscountCode(code);
      setShowAvailable(false);
      toast.success(` Áp dụng "${code}" thành công! Giảm ${Number(data.discountAmount).toLocaleString('vi-VN')}₫`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setDiscountAmount(0);
      setAppliedDiscount(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  // THÊM hàm hủy mã
  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setDiscountAmount(0);
    setAppliedDiscount(null);
    toast.info('Đã hủy mã giảm giá');
  };

  /* ── Checkout ── */
  const handleCheckout = async () => {
    if (cartItems.length === 0) { toast.error("Giỏ hàng trống!"); return; }
    if (!customerName.trim()) { toast.error("Vui lòng nhập tên người nhận!"); return; }
    if (!customerPhone.trim()) { toast.error("Vui lòng nhập số điện thoại!"); return; }
    if (!customerAddress.trim()) { toast.error("Vui lòng nhập địa chỉ giao hàng!"); return; }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/payments/create-order", {
        paymentMethod,
        clientIp: "127.0.0.1",
        cartItemIds: cartItems.map(i => i.id),
        customerName,
        customerPhone,
        customerAddress,
        customerNotes,
        shippingFee,
        discountAmount,
        discount_code: discountCode || null,
      });
      if (response.data.success) {
        await fetchCart();
        if (paymentMethod === "cod") {
          toast.success("Đặt hàng thành công!");
          navigate(`/payment-success?orderId=${response.data.orderId}&method=cod`);
        } else if (paymentMethod === "vnpay" && response.data.paymentUrl) {
          window.location.href = response.data.paymentUrl;
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi tạo đơn hàng");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">

        <h1 className="flex items-center gap-3 text-3xl font-bold mb-8">
          <CreditCard size={30} className="text-blue-600" />
          Thanh Toán
        </h1>

        {/* Chưa đăng nhập */}
        {!token ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="flex flex-col items-center gap-3 text-gray-400 mb-6">
              <LogIn size={48} strokeWidth={1.5} />
              <p className="text-gray-500 text-lg">Vui lòng đăng nhập để thanh toán</p>
            </div>
            <button onClick={() => navigate("/login")}
              className="flex items-center gap-2 mx-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              <LogIn size={18} /> Đăng nhập
            </button>
          </div>

        ) : cartLoading ? (
          <div className="flex flex-col justify-center items-center min-h-[400px] gap-3 text-gray-400">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <p className="text-base">Đang tải giỏ hàng...</p>
          </div>

        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ─── Cột trái ─── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Danh sách sản phẩm */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold mb-6">
                  <ShoppingBag size={20} className="text-blue-500" />
                  Danh Sách Sản Phẩm
                </h2>
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400 py-8">
                    <PackageOpen size={36} strokeWidth={1.5} />
                    <p className="text-sm">Chưa chọn sản phẩm nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex gap-4 border-b pb-4 items-start">
                        <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={item.image_url || "https://via.placeholder.com/100"}
                            alt={item.product_name || item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 flex justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.product_name || item.name}</h3>
                            <p className="text-gray-500 text-sm mt-1">SL: {item.quantity}</p>
                            <p className="text-blue-600 font-semibold mt-2">
                              {Number(item.price).toLocaleString("vi-VN")} ₫/cái
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {(item.price * item.quantity).toLocaleString("vi-VN")} ₫
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ══ Thông tin giao hàng ══ */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold mb-6">
                  <Truck size={20} className="text-blue-500" />
                  Thông Tin Giao Hàng
                </h2>

                {/* Bộ chọn địa chỉ đã lưu */}
                {savedAddresses.length > 0 && (
                  <div className="mb-5">
                    <button type="button" onClick={() => setShowSaved(v => !v)}
                      className="flex items-center justify-between w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-semibold text-blue-700 transition mb-3">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} /> Địa chỉ đã lưu ({savedAddresses.length})
                      </span>
                      {showSaved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showSaved && (
                      <div className="space-y-2 mb-4">
                        {savedAddresses.map(addr => (
                          <button key={addr.id} type="button"
                            onClick={() => handleSelectSaved(addr)}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition
                              ${selectedAddrId === addr.id
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                            <span className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                              ${selectedAddrId === addr.id ? "border-blue-500" : "border-gray-300"}`}>
                              {selectedAddrId === addr.id && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-800">{addr.receiver}</span>
                                <span className="text-sm text-gray-400">·</span>
                                <span className="text-sm text-gray-600">{addr.phone}</span>
                                {addr.is_default && (
                                  <span className="flex items-center gap-0.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                                    <Star size={9} fill="currentColor" /> Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{addr.full_address}</p>
                            </div>
                          </button>
                        ))}

                        {/* Nhập địa chỉ mới */}
                        <button type="button" onClick={handleUseNew}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                            ${selectedAddrId === null
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                              : "border-dashed border-gray-300 hover:border-blue-300 hover:bg-gray-50"}`}>
                          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                            ${selectedAddrId === null ? "border-blue-500" : "border-gray-300"}`}>
                            {selectedAddrId === null && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                            )}
                          </span>
                          <Plus size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">Nhập địa chỉ mới</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Khu vực nhập liệu */}
                <div className="space-y-4">
                  {selectedAddrId !== null && savedAddresses.length > 0 ? (
                    /* Địa chỉ đã lưu — cho sửa tay nếu cần */
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                      <p className="flex items-center gap-1.5 text-green-700 text-sm font-semibold">
                        <CheckCircle size={14} /> Giao tới địa chỉ đã lưu
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}><User size={14} className="text-blue-500" /> Người nhận</label>
                          <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}><Phone size={14} className="text-blue-500" /> Điện thoại</label>
                          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}><MapPin size={14} className="text-blue-500" /> Địa chỉ</label>
                        <input value={customerAddress}
                          onChange={e => { setCustomerAddress(e.target.value); calculateShippingFee(e.target.value); }}
                          className={inputCls} />
                      </div>
                    </div>
                  ) : (
                    /* Nhập mới — tên + SĐT + AddressSelector */
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><User size={14} className="text-blue-500" /> Tên người nhận <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                              placeholder="Nhập tên người nhận"
                              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}><Phone size={14} className="text-blue-500" /> Số điện thoại <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                              placeholder="Nhập số điện thoại"
                              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}><MapPin size={14} className="text-blue-500" /> Địa chỉ giao hàng <span className="text-red-500">*</span></label>
                        <AddressSelector
                          onChange={data => {
                            setCustomerAddress(data.fullAddress);
                            calculateShippingFee(data.fullAddress);
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* Phí ship */}
                  {shippingFee > 0 && (
                    <p className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-4 py-2.5 rounded-xl">
                      <Truck size={14} className="text-blue-500 shrink-0" />
                      Phí vận chuyển:&nbsp;<strong>{shippingFee.toLocaleString("vi-VN")} ₫</strong>
                      &nbsp;<span className="text-gray-500">{shippingFee === 50000 ? "(Nội thành Hà Nội)" : "(Tỉnh thành khác)"}</span>
                    </p>
                  )}

                  {/* Ghi chú */}
                  <div>
                    <label className={labelCls}><FileText size={14} className="text-blue-500" /> Ghi chú đơn hàng</label>
                    <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)}
                      placeholder="Nhập ghi chú (tuỳ chọn)" rows="2"
                      className={`${inputCls} resize-none`} />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Cột phải — Tóm tắt đơn hàng ─── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4 space-y-6">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <CreditCard size={20} className="text-blue-500" />
                  Tóm Tắt Đơn Hàng
                </h2>

                {/* Mã giảm giá */}
                <div>
                  <label className={labelCls}>
                    <Ticket size={14} className="text-blue-500" /> Mã giảm giá
                  </label>

                  {/* Nếu đã áp dụng thành công */}
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-300 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-green-700 font-mono">{appliedDiscount.code}</p>
                          <p className="text-xs text-green-600">
                            {appliedDiscount.type === 'percent'
                              ? `Giảm ${appliedDiscount.value}%`
                              : `Giảm ${Number(appliedDiscount.value).toLocaleString('vi-VN')}₫`}
                            {' — '}
                            Tiết kiệm <strong>{Number(discountAmount).toLocaleString('vi-VN')}₫</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveDiscount}
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0 ml-2"
                        title="Hủy mã"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Input nhập mã */}
                      <div className="flex gap-2">
                        <input
                          value={discountCode}
                          onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                          placeholder="Nhập mã giảm giá"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleApplyDiscount()}
                          disabled={discountLoading || !discountCode.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {discountLoading
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Tag size={14} />}
                          Áp dụng
                        </button>
                      </div>

                      {/* Danh sách mã có sẵn */}
                      {availableDiscounts.length > 0 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowAvailable(v => !v)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
                          >
                            <Gift size={12} />
                            {showAvailable ? 'Ẩn' : `Xem ${availableDiscounts.length} mã có sẵn`}
                            {showAvailable ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {showAvailable && (
                            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {availableDiscounts.map(d => (
                                <button
                                  key={d.code}
                                  type="button"
                                  onClick={() => handleApplyDiscount(d.code)}
                                  className="w-full flex items-center justify-between gap-2 p-2.5 border border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-left transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-bold text-blue-700 text-xs bg-blue-100 px-2 py-0.5 rounded-lg flex-shrink-0">
                                      {d.code}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-gray-700 truncate">
                                        {d.type === 'percent' ? `Giảm ${d.value}%` : `Giảm ${Number(d.value).toLocaleString('vi-VN')}₫`}
                                      </p>
                                      {d.min_order_value > 0 && (
                                        <p className="text-xs text-gray-400">
                                          Đơn từ {Number(d.min_order_value).toLocaleString('vi-VN')}₫
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs text-blue-600 font-semibold group-hover:underline flex-shrink-0">
                                    Dùng
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Chi tiết giá */}
                <div className="space-y-2 text-sm border-t pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính ({cartItems.length} sản phẩm)</span>
                    <span>{subtotal.toLocaleString("vi-VN")} ₫</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span>{shippingFee > 0 ? `${shippingFee.toLocaleString("vi-VN")} ₫` : "—"}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá</span>
                      <span>- {discountAmount.toLocaleString("vi-VN")} ₫</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-3">
                    <span>Tổng cộng</span>
                    <span className="text-blue-600">{finalTotal.toLocaleString("vi-VN")} ₫</span>
                  </div>
                </div>

                {/* Phương thức thanh toán */}
                <div>
                  <label className={labelCls}><CreditCard size={14} className="text-blue-500" /> Phương thức thanh toán</label>
                  <div className="space-y-2">
                    {[
                      { value: "cod", label: "Thanh toán khi nhận hàng (COD)" },
                      { value: "vnpay", label: "Thanh toán qua VNPay" },
                    ].map(opt => (
                      <label key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                          ${paymentMethod === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"}`}>
                        <input type="radio" name="payment" value={opt.value}
                          checked={paymentMethod === opt.value}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className="accent-blue-600" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Nút đặt hàng */}
                <button onClick={handleCheckout} disabled={loading || cartItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
                    : <><CheckCircle size={18} /> Đặt hàng ngay</>}
                </button>

                <button onClick={() => navigate("/cart")}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition">
                  <ArrowLeft size={14} /> Quay lại giỏ hàng
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;