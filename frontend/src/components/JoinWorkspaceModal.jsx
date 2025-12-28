import { useState } from "react";
import useAuth from "../hooks/useAuth.js";
import { X, Loader2, UserPlus, Ticket, AlertCircle } from "lucide-react";
import {
  LanternIcon,
  HorseIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
  RedEnvelopeIcon,
} from "./tet/TetIcons";

function JoinWorkspaceModal({ onClose, onSuccess }) {
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { authFetch } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!joinCode.trim()) {
      setError("Please enter join code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authFetch("/api/workspaces/join-requests", {
        method: "POST",
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      onSuccess(result);
    } catch (err) {
      setError(err.message || "Failed to join workspace");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-200 bg-white shadow-2xl shadow-amber-200/30 animate-zoom-bounce">
        {/* Gradient top border */}
        <div className="h-2 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-5 text-white">
          {/* Decorative elements */}
          <div className="absolute left-3 top-3 opacity-20">
            <ApricotBlossomIcon className="h-6 w-6" />
          </div>
          <div className="absolute right-12 top-3 opacity-20">
            <PeachBlossomIcon className="h-6 w-6" />
          </div>
          <div className="absolute left-1/2 bottom-2 -translate-x-1/2 opacity-15">
            <LanternIcon className="h-8 w-8 animate-swing" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Join Workspace</h2>
              <p className="text-sm text-red-100">Enter code to connect!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Join Code Input */}
          <div className="mb-6">
            <label htmlFor="joinCode" className="mb-2 block text-sm font-medium text-gray-700">
              Join Code
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <Ticket className="h-5 w-5 text-amber-500" />
              </div>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border-2 border-amber-200 bg-white py-3.5 pl-12 pr-4 text-center font-mono text-lg font-bold tracking-widest text-gray-900 placeholder-gray-400 transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                placeholder="ABCD1234"
                autoFocus
                maxLength={20}
              />
            </div>
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500">
              <RedEnvelopeIcon className="h-3 w-3 text-red-400" />
              <span>Enter code shared by workspace admin</span>
            </p>
          </div>

          {/* Illustration */}
          <div className="mb-6 flex items-center justify-center gap-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 py-4">
            <LanternIcon className="h-10 w-10 text-red-500 animate-swing" />
            <div className="text-center">
              <p className="text-sm font-medium text-amber-800">Join the team!</p>
              <p className="text-xs text-amber-600">Collaborate and grow</p>
            </div>
            <LanternIcon className="h-10 w-10 text-red-500 animate-swing" style={{ animationDelay: '1.5s' }} />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-200 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <HorseIcon className="h-5 w-5" />
                  <span>Join</span>
                </>
              )}
            </button>
          </div>

          {/* Footer decoration */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {[RedEnvelopeIcon, LanternIcon, HorseIcon, ApricotBlossomIcon, PeachBlossomIcon].map((Icon, i) => (
              <Icon
                key={i}
                className={`h-4 w-4 ${i % 2 === 0 ? 'text-red-400' : 'text-amber-400'} opacity-60 animate-bounce`}
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '2s' }}
              />
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinWorkspaceModal;
