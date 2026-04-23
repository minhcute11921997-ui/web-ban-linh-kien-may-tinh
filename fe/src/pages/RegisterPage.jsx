import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import { toast } from "react-toastify";
import AddressSelector from "../components/AddressSelector";

const RegisterPage = () => {
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!form.username.trim())
      newErrors.username = "Vui lòng nhập tên đăng nhập";

    if (!form.full_name.trim()) newErrors.full_name = "Vui lòng nhập họ tên";
    else if (/[0-9]/.test(form.full_name))
      newErrors.full_name = "Họ tên không được chứa số";

    if (!form.email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Email không hợp lệ";

    if (!form.password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6)
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";

    //  Validate số điện thoại đúng 10 chữ số
    if (form.phone && !/^[0-9]{10}$/.test(form.phone))
      newErrors.phone = "Số điện thoại phải có đúng 10 chữ số";

    // Validate địa chỉ đã chọn đủ chưa
    if (!form.address.trim()) newErrors.address = "Vui lòng chọn địa chỉ";

    return newErrors;
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: "" });
  };

  //  Xử lý phone — chỉ cho nhập số, tối đa 10 ký tự
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, phone: value });
    if (value && value.length < 10)
      setErrors({ ...errors, phone: "Số điện thoại phải có đúng 10 chữ số" });
    else setErrors({ ...errors, phone: "" });
  };

  // Nhận fullAddress từ AddressSelector
  const handleAddressChange = (addressData) => {
    setForm({ ...form, address: addressData.fullAddress });
    setErrors({ ...errors, address: "" });
  };

  const handleFullNameChange = (e) => {
    const value = e.target.value;
    if (isComposing) {
      setForm({ ...form, full_name: value });
      setErrors({ ...errors, full_name: "" });
      return;
    }
    if (/[0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/`~\-]/.test(value)) {
      setErrors({
        ...errors,
        full_name: "Họ tên không được chứa số hoặc kí tự đặc biệt",
      });
      return;
    }
    setForm({ ...form, full_name: value });
    setErrors({ ...errors, full_name: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Đăng ký thất bại!";
      if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
      else if (msg.toLowerCase().includes("username"))
        setErrors({ username: msg });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:ring-red-400"
        : "focus:ring-blue-500"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          Đăng ký tài khoản
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên đăng nhập *
            </label>
            <input
              type="text"
              placeholder="vd: nguyenvana123"
              value={form.username}
              onChange={handleChange("username")}
              className={inputClass("username")}
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.username}</p>
            )}
          </div>

          {/* Họ tên */}
          <div>
            <label className="block text-sm font-medium mb-1">Họ tên *</label>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              value={form.full_name}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                const value = e.target.value;
                if (/[0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/`~\-]/.test(value)) {
                  setErrors({
                    ...errors,
                    full_name: "Họ tên không được chứa số hoặc ký tự đặc biệt",
                  });
                } else {
                  setForm({ ...form, full_name: value });
                  setErrors({ ...errors, full_name: "" });
                }
              }}
              onChange={handleFullNameChange}
              className={inputClass("full_name")}
            />
            {errors.full_name && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange("email")}
              className={inputClass("email")}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.email}</p>
            )}
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu *</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange("password")}
              className={inputClass("password")}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.password}</p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              placeholder="0912345678"
              value={form.phone}
              onChange={handlePhoneChange}
              maxLength={10}
              inputMode="numeric"
              className={inputClass("phone")}
            />

            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.phone}</p>
            )}
          </div>

          {/* Địa chỉ — dùng AddressSelector */}
          <div>
            <label className="block text-sm font-medium mb-1">Địa chỉ *</label>
            {/*  AddressSelector */}
            <AddressSelector onChange={handleAddressChange} />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.address}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-500">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
