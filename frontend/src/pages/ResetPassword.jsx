import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { resetPassword } from "../api.js";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setError("Token không hợp lệ. Vui lòng kiểm tra lại link trong email.");
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    // Validate passwords match
    if (formState.newPassword !== formState.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    // Validate password length
    if (formState.newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, formState.newPassword);
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <AuthLayout
        previewVariant="hidden-scroll"
        title="Đặt lại mật khẩu"
        subtitle="Đang tải..."
      >
        <div className="text-center text-slate-400">Đang xử lý...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      previewVariant="hidden-scroll"
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới cho tài khoản của bạn."
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
          name="newPassword"
          label="Mật khẩu mới"
          type="password"
          placeholder="••••••••"
          value={formState.newPassword}
          onChange={handleChange("newPassword")}
          required
          minLength={6}
        />

        <FormField
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="••••••••"
          value={formState.confirmPassword}
          onChange={handleChange("confirmPassword")}
          required
          minLength={6}
        />

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            <p className="font-semibold">✓ Đặt lại mật khẩu thành công!</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Đang chuyển hướng đến trang đăng nhập...
            </p>
          </div>
        )}

        <button
          type="submit"
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 font-semibold text-white transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading || !token || success}
        >
          <span className="absolute inset-0 opacity-0 blur-2xl transition duration-500 group-hover:opacity-60">
            <span className="block h-full w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
          </span>
          <span className="relative flex items-center gap-2">
            {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </span>
        </button>

        <div className="text-center">
          <Link 
            to="/forgot-password" 
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Gửi lại link đặt lại mật khẩu
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;

