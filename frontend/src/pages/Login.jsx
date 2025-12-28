import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import useAuth from "../hooks/useAuth.js";
import { TetAuthLayout, HorseIcon } from "../components/tet";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const loginFields = [
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "enter-email@domain.com",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
  },
];

const initialState = { email: "", password: "" };

function LoginPage() {
  const [formState, setFormState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(null);
    setIsLoading(true);

    try {
      const result = await login(formState);
      setSuccess({
        message: "Signed in successfully!",
        user: result.user,
      });
      // Redirect to workspaces after successful login
      setTimeout(() => {
        navigate("/workspaces");
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TetAuthLayout
      title="Sign In"
      subtitle="Use your registered account to access the application"
      footer={
        <span>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-red-600 underline-offset-2 hover:text-red-700 transition-colors">
            Sign up now
          </Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {loginFields.map((field) => (
          <FormField
            key={field.name}
            {...field}
            value={formState[field.name]}
            onChange={handleChange(field.name)}
          />
        ))}

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-amber-600 hover:text-red-600 underline-offset-2 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 animate-slide-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-heartbeat" />
              <span className="font-semibold">{success.message}</span>
            </div>
            <p className="mt-1 text-xs text-emerald-600 ml-7">
              Welcome {success.user?.fullName || success.user?.email}!
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:shadow-red-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <HorseIcon className="h-5 w-5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>
    </TetAuthLayout>
  );
}

export default LoginPage;
