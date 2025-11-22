import { useState } from "react";
import { createChannel } from "../api";
import useAuth from "../hooks/useAuth";

function CreateChannelModal({ workspaceId, onClose, onSuccess }) {
  const { authFetch } = useAuth();
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { authFetch } = useAuth(); // Get authFetch

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const newChannel = await authFetch("/api/channels", {
        method: "POST",
        body: JSON.stringify({
          ...formState,
          workspaceId,
        }),
      });
      onSuccess(newChannel);
    } catch (err) {
      let errorMsg = err.message || "Không thể tạo channel";
      if (err.status === 403) {
        errorMsg = "Bạn không có quyền tạo channel trong workspace này.";
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
            Tạo Channel Mới
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

          {/* Privacy Setting */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-200">
              Quyền riêng tư
            </label>
            <div className="space-y-3">
              {/* Public Option */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  !formState.isPrivate
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="privacy"
                  checked={!formState.isPrivate}
                  onChange={() =>
                    setFormState((prev) => ({ ...prev, isPrivate: false }))
                  }
                  className="mt-1 h-4 w-4 text-indigo-500 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white"># Public</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Tất cả thành viên workspace đều có thể tham gia
                  </p>
                </div>
              </label>

              {/* Private Option */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  formState.isPrivate
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="privacy"
                  checked={formState.isPrivate}
                  onChange={() =>
                    setFormState((prev) => ({ ...prev, isPrivate: true }))
                  }
                  className="mt-1 h-4 w-4 text-indigo-500 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">🔒 Private</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Chỉ những người được mời mới có thể tham gia
                  </p>
                </div>
              </label>
            </div>
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
                {isLoading ? "Đang tạo..." : "Tạo Channel"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
