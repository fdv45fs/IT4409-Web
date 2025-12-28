import { useState } from "react";
import { Link } from "react-router-dom";
import FormField from "../components/FormField.jsx";
import useAuth from "../hooks/useAuth.js";
import { TetAuthLayout, HorseIcon, RedEnvelopeIcon } from "../components/tet";
import { CheckCircle2, AlertCircle, Loader2, UserPlus } from "lucide-react";

const registerFields = [
  {
    name: "fullName",
    label: "Full Name",
    type: "text",
    placeholder: "John Doe",
  },
  {
    name: "username",
    label: "Username",
    type: "text",
    placeholder: "hustian"
  },
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
  {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password",
    placeholder: "••••••••",
  },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ],
  },
  {
    name: "dateOfBirth",
    label: "Date of Birth",
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
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registerData } = formState;
      const result = await register(registerData);
      setSuccess({
        message: "Account created successfully!",
        user: result.user,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TetAuthLayout
      title="Create Account"
      subtitle="Enter your personal information to create profile"
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-red-600 underline-offset-2 hover:text-red-700 transition-colors">
            Sign In
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Form Fields - 2 columns on larger screens */}
        <div className="space-y-4">
          {registerFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              value={formState[field.name]}
              onChange={handleChange(field.name)}
            />
          ))}
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
              Welcome {success.user?.fullName || success.user?.email}! You can sign in now.
            </p>
            <Link
              to="/login"
              className="mt-3 ml-7 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              <HorseIcon className="h-3 w-3" />
              Go to sign in page
            </Link>
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
              <UserPlus className="h-5 w-5" />
              <span>Create Account</span>
            </>
          )}
        </button>

        {/* Benefits hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-amber-600/80">
          <RedEnvelopeIcon className="h-4 w-4 text-red-500" />
          <span>Register now to receive New Year benefits!</span>
        </div>
      </form>
    </TetAuthLayout>
  );
}

export default RegisterPage;
