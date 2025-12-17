import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import useAuth from "../hooks/useAuth.js";

const registerFields = [
  {
    name: "fullName",
    label: "Họ và tên",
    type: "text",
    placeholder: "Nguyễn Văn A",
  },
  { name: "username", label: "Tên đăng nhập", type: "text", placeholder: "hustian" },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "nhap-email@domain.com",
  },
  {
    name: "password",
    label: "Mật khẩu",
    type: "password",
    placeholder: "••••••••",
  },
  {
    name: "confirmPassword",
    label: "Nhập lại mật khẩu",
    type: "password",
    placeholder: "••••••••",
  },
  {
    name: "gender",
    label: "Giới tính",
    type: "select",
    options: [
      { value: "male", label: "Nam" },
      { value: "female", label: "Nữ" },
      { value: "other", label: "Khác" },
    ],
  },
  {
    name: "dateOfBirth",
    label: "Ngày sinh",
    type: "date",
  },
];

const initialState = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  gender: "male",
  dateOfBirth: "",
};

function RegisterPage() {
  const [formState, setFormState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const { register } = useAuth();

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(null);

    // Validate password confirmation
    if (formState.password !== formState.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    setIsLoading(true);

    try {
      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registerData } = formState;
      const result = await register(registerData);
      setSuccess({
        message: "Tạo tài khoản thành công!",
        user: result.user,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      previewVariant="static"
      title="Đăng ký tài khoản"
      subtitle="Nhập thông tin cá nhân để khởi tạo hồ sơ."
      footer={
        <span>
          Bạn đã có tài khoản?{" "}
          <Link to="/login" className="font-medium text-blue-600 underline-offset-2 hover:text-blue-700">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {registerFields.map((field) => (
          <FormField
            key={field.name}
            {...field}
            value={formState[field.name]}
            onChange={handleChange(field.name)}
          />
        ))}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            <p className="font-semibold">{success.message}</p>
            <p className="text-xs text-emerald-600">
              Xin chào {success.user?.fullName || success.user?.email}! Bạn có thể đăng nhập ngay.
            </p>
          </div>
        )}
        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? "Đang xử lý..." : "Tạo tài khoản"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
