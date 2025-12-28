import { useState } from "react";
import { joinChannelByCode } from "../api";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";

function JoinChannelModal({ onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { authFetch } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      await joinChannelByCode(code.trim(), authFetch);
      addToast("Channel join request sent successfully", "success");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to join channel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-[rgb(30,41,59)] px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Join Channel</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-[rgb(30,41,59)]"
              >
                Channel join code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[rgb(30,41,59)] placeholder-gray-400 transition focus:border-[rgb(30,41,59)] focus:outline-none focus:ring-2 focus:ring-[rgb(30,41,59)]/20"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[rgb(30,41,59)] px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Join"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinChannelModal;
