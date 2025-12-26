import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { X, Hash, Lock, Loader2, Plus, Globe } from "lucide-react";
import {
  LanternIcon,
  HorseIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
  RedEnvelopeIcon,
} from "./tet/TetIcons";

function CreateChannelModal({ workspaceId, onClose, onSuccess }) {
  const { authFetch } = useAuth();
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-2xl shadow-amber-200/30 animate-zoom-bounce">
        {/* Gradient top border */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Hash className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Tạo Channel Mới</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Tên Channel <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Hash className="h-4 w-4 text-amber-500" />
              </div>
              <input
                id="name"
                type="text"
                value={formState.name}
                onChange={handleChange("name")}
                required
                placeholder="general, random..."
                className="w-full rounded-lg border-2 border-amber-200 bg-white py-2.5 pl-9 pr-4 text-sm transition focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-100"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
              Mô tả (tùy chọn)
            </label>
            <textarea
              id="description"
              value={formState.description}
              onChange={handleChange("description")}
              rows={2}
              placeholder="Mục đích của channel..."
              className="w-full rounded-lg border-2 border-amber-200 bg-white px-3 py-2 text-sm transition focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-100"
            />
          </div>

          {/* Privacy */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Quyền riêng tư</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Public */}
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${!formState.isPrivate ? "border-emerald-400 bg-emerald-50" : "border-amber-200 hover:border-amber-300"}`}>
                <input
                  type="radio"
                  name="privacy"
                  checked={!formState.isPrivate}
                  onChange={() => setFormState((prev) => ({ ...prev, isPrivate: false }))}
                  className="h-4 w-4 text-emerald-500"
                />
                <Hash className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Public</span>
              </label>

              {/* Private */}
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition ${formState.isPrivate ? "border-amber-400 bg-amber-50" : "border-amber-200 hover:border-amber-300"}`}>
                <input
                  type="radio"
                  name="privacy"
                  checked={formState.isPrivate}
                  onChange={() => setFormState((prev) => ({ ...prev, isPrivate: true }))}
                  className="h-4 w-4 text-amber-500"
                />
                <Lock className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Private</span>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {[RedEnvelopeIcon, LanternIcon, HorseIcon].map((Icon, i) => (
                <Icon key={i} className={`h-4 w-4 ${i === 1 ? 'text-red-400' : 'text-amber-400'} opacity-50`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-200 hover:shadow-lg disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>{isLoading ? "Đang tạo..." : "Tạo Channel"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
