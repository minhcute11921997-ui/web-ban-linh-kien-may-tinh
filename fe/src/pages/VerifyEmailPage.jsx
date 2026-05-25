import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { resendVerification, verifyEmail } from "../api/authApi";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^\d{6}$/.test(code)) {
      toast.error("Vui lòng nhập email và mã 6 số");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail({ email: email.trim(), code });
      toast.success("Xác minh email thành công. Vui lòng đăng nhập.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Xác minh email thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }

    setResending(true);
    try {
      await resendVerification(email.trim());
      toast.success("Đã gửi lại mã xác minh");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể gửi lại mã");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">Xác minh email</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Nhập mã 6 số đã được gửi tới email của bạn.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mã xác minh</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              className="w-full border px-4 py-2 rounded-lg text-center tracking-[0.5em] text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {loading ? "Đang xác minh..." : "Xác minh"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full mt-3 border border-blue-200 text-blue-600 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-50 font-semibold"
        >
          {resending ? "Đang gửi..." : "Gửi lại mã"}
        </button>

        <p className="text-center mt-4 text-sm text-gray-500">
          Đã xác minh?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
