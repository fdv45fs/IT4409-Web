import { useState } from "react";
import { joinChannelByCode } from "../api";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import { X, Loader2, LogIn, Ticket, AlertCircle, Hash } from "lucide-react";
import {
  LanternIcon,
  HorseIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
  RedEnvelopeIcon,
} from "./tet/TetIcons";

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
      addToast("Đã gửi yêu cầu tham gia channel thành công", "success");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Không thể tham gia channel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-2xl shadow-amber-200/30 animate-zoom-bounce">
        {/* Gradient top border */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <LogIn className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Tham gia Channel</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          {/* Code Input */}
          <div className="mb-4">
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
              Mã tham gia channel
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Ticket className="h-5 w-5 text-amber-500" />
              </div>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="w-full rounded-lg border-2 border-amber-200 bg-white py-3 pl-11 pr-4 text-center font-mono text-lg font-bold tracking-widest text-gray-900 placeholder-gray-400 transition focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-100"
                required
                maxLength={20}
                autoFocus
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-gray-500">
              Nhập mã được chia sẻ bởi admin của channel
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Illustration */}
          <div className="mb-4 flex items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 py-3">
            <Hash className="h-6 w-6 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">Kết nối với team!</span>
            <LanternIcon className="h-6 w-6 text-red-500 animate-swing" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-200 hover:shadow-lg disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HorseIcon className="h-4 w-4" />}
              <span>{isLoading ? "Đang xử lý..." : "Tham gia"}</span>
            </button>
          </div>

          {/* Footer decoration */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {[RedEnvelopeIcon, LanternIcon, ApricotBlossomIcon, PeachBlossomIcon].map((Icon, i) => (
              <Icon key={i} className={`h-4 w-4 ${i % 2 === 0 ? 'text-red-400' : 'text-amber-400'} opacity-50`} />
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinChannelModal;
