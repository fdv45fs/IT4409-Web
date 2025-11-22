import { useState, useEffect } from "react";
import { updateChannel } from "../api";
import useAuth from "../hooks/useAuth";

function UpdateChannelModal({ channel, onClose, onSuccess }) {
  const [formState, setFormState] = useState({
    name: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { authFetch } = useAuth(); // Get authFetch

  useEffect(() => {
    if (channel) {
      setFormState({
        name: channel.name,
        description: channel.description || "",
      });
    }
  }, [channel]);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Pass authFetch to updateChannel
      const updatedChannel = await updateChannel(
        channel.id,
        {
          name: formState.name,
          description: formState.description || undefined,
        },
        authFetch
      );
      onSuccess(updatedChannel);
    } catch (err) {
      let errorMsg = err.message || "Không thể cập nhật channel";
      if (err.status === 403) {
        errorMsg = "Bạn không có quyền cập nhật channel này.";
      }
      setError(errorMsg);
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

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Cập nhật Channel
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Tên Channel <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formState.name}
              onChange={handleChange("name")}
              required
              placeholder="VD: general, random..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Mô tả (tùy chọn)
            </label>
            <textarea
              id="description"
              value={formState.description}
              onChange={handleChange("description")}
              rows={3}
              placeholder="Mô tả mục đích của channel..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 px-6 py-3 font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 font-semibold text-white transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoading}
            >
              <span className="absolute inset-0 opacity-0 blur-xl transition duration-500 group-hover:opacity-60">
                <span className="block h-full w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
              </span>
              <span className="relative">
                {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateChannelModal;
