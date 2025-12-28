import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { resetPassword } from "../api.js";
import { TetAuthLayout, HorseIcon, LanternIcon } from "../components/tet";
import { CheckCircle2, AlertCircle, Loader2, KeyRound, ArrowLeft } from "lucide-react";

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
      setError("Invalid token. Please check the link in your email.");
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
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formState.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
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

  // Loading state - waiting for token
  if (!token && !error) {
    return (
      <TetAuthLayout
        title="Reset Password"
        subtitle="Loading..."
      >
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <Loader2 className="h-12 w-12 text-red-500 animate-spin" />
            <HorseIcon className="absolute inset-0 m-auto h-6 w-6 text-amber-500" />
          </div>
          <p className="mt-4 text-gray-500">Processing...</p>
        </div>
      </TetAuthLayout>
    );
  }

  return (
    <TetAuthLayout
      title="Reset Password"
      subtitle="Enter a new password for your account"
      footer={
        <span>
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-medium text-red-600 underline-offset-2 hover:text-red-700 transition-colors"
          >
            Sign In
          </Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          name="newPassword"
          label="New Password"
          type="password"
          placeholder="••••••••"
          value={formState.newPassword}
          onChange={handleChange("newPassword")}
          required
          minLength={6}
        />

        <FormField
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={formState.confirmPassword}
          onChange={handleChange("confirmPassword")}
          required
          minLength={6}
        />

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
              <span className="font-semibold">Password reset successfully!</span>
            </div>
            <p className="mt-2 text-xs text-emerald-600 ml-7">
              Redirecting to sign in page...
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:shadow-red-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={isLoading || !token || success}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <KeyRound className="h-5 w-5" />
              <span>Reset Password</span>
            </>
          )}
        </button>

        {/* Links */}
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link
            to="/forgot-password"
            className="text-amber-600 hover:text-red-600 transition-colors"
          >
            Resend reset link
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </form>
    </TetAuthLayout>
  );
}

export default ResetPasswordPage;
