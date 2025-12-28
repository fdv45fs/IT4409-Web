import { useState } from "react";
import { Link } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import { forgotPassword } from "../api.js";
import { TetAuthLayout, LanternIcon } from "../components/tet";
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowLeft } from "lucide-react";

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
      await forgotPassword(email);
      setSuccess(true);
      setEmail(""); // Clear form
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TetAuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a password reset link"
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
          name="email"
          label="Email"
          type="email"
          placeholder="enter-email@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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
              <span className="font-semibold">Email sent!</span>
            </div>
            <p className="mt-2 text-xs text-emerald-600 ml-7">
              Please check your inbox and follow the instructions to reset your password.
              The link will expire in 15 minutes.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:shadow-red-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={isLoading || !email}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              <span>Send reset link</span>
            </>
          )}
        </button>

        {/* Links */}
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link
            to="/register"
            className="text-amber-600 hover:text-red-600 transition-colors"
          >
            Don't have an account? Sign up now
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

export default ForgotPasswordPage;
