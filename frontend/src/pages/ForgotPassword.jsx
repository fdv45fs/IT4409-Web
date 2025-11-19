import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { forgotPassword } from "../api.js";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);
      setSuccess(true);
      setEmail(""); // Clear form
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      previewVariant="hidden-scroll"
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn để nhận link đặt lại mật khẩu."
      footer={
        <span>
          Đã nhớ lại mật khẩu?{" "}
          <Link 
            to="/login" 
            className="text-indigo-300 underline-offset-2 hover:text-indigo-200"
          >
            Đăng nhập
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          name="email"
          label="Email"
          type="email"
          placeholder="nhap-email@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            <p className="font-semibold">✓ Email đã được gửi!</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
              Link sẽ hết hạn sau 15 phút.
            </p>
          </div>
        )}

        <button
          type="submit"
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 font-semibold text-white transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading || !email}
        >
          <span className="absolute inset-0 opacity-0 blur-2xl transition duration-500 group-hover:opacity-60">
            <span className="block h-full w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
          </span>
          <span className="relative flex items-center gap-2">
            {isLoading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
          </span>
        </button>

        <div className="text-center">
          <Link 
            to="/register" 
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Chưa có tài khoản? Đăng ký ngay
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;

