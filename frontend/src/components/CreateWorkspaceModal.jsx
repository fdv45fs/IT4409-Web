import { useState } from "react";
import useAuth from "../hooks/useAuth.js";
import {
  X,
  Upload,
  Globe,
  Lock,
  Loader2,
  Plus,
  ImageIcon,
} from "lucide-react";
import {
  LanternIcon,
  HorseIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
  RedEnvelopeIcon,
  SparkleDecor,
} from "./tet/TetIcons";

function CreateWorkspaceModal({ onClose, onSuccess }) {
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { authFetch } = useAuth();

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("please upload a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must not exceed 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append("name", formState.name);
        if (formState.description) {
          formData.append("description", formState.description);
        }
        formData.append("isPrivate", formState.isPrivate.toString());
        formData.append("avatar", avatarFile);

        const newWorkspace = await authFetch("/api/workspaces", {
          method: "POST",
          body: formData,
        });
        onSuccess(newWorkspace);
      } else {
        const newWorkspace = await authFetch("/api/workspaces", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formState.name,
            description: formState.description || undefined,
            isPrivate: formState.isPrivate,
          }),
        });
        onSuccess(newWorkspace);
      }
    } catch (err) {
      let errorMsg = err.message || "Không thể tạo workspace";

      if (errorMsg.includes("WORKSPACE_ADMIN") || errorMsg.includes("Role") || errorMsg.includes("not found")) {
        errorMsg = "No permission to create workspace.";
      } else if (err.status === 401) {
        errorMsg = "Session expired - please log in again.";
      } else if (err.status === 500) {
        errorMsg = "Server error: " + errorMsg;
      }

      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-2xl shadow-amber-200/30 animate-zoom-bounce">
        {/* Gradient top border */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>

        {/* Header - Compact */}
        <div className="relative flex items-center justify-between bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-5 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Plus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Create New Workspace</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form - 2 Column Layout */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Avatar + Name in row */}
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {avatarPreview ? (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-16 w-16 rounded-xl object-cover border-2 border-amber-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="avatar-upload"
                      className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 transition hover:border-amber-400 hover:bg-amber-100"
                    >
                      <ImageIcon className="h-6 w-6 text-amber-400" />
                    </label>
                  )}
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Name */}
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={handleChange("name")}
                    required
                    placeholder="e.g., Team Marketing..."
                    className="w-full rounded-lg border-2 border-amber-200 px-3 py-2 text-sm transition focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-100"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Description (optional)
                </label>
                <textarea
                  value={formState.description}
                  onChange={handleChange("description")}
                  rows={2}
                  placeholder="Short description..."
                  className="w-full rounded-lg border-2 border-amber-200 px-3 py-2 text-sm transition focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-100"
                />
              </div>
            </div>

            {/* Right Column - Privacy */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">
                Privacy
              </label>
              <div className="space-y-2">
                {/* Public */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition ${!formState.isPrivate
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-amber-200 hover:border-amber-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    checked={!formState.isPrivate}
                    onChange={() => setFormState((prev) => ({ ...prev, isPrivate: false }))}
                    className="h-4 w-4 text-emerald-500"
                  />
                  <Globe className="h-4 w-4 text-emerald-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Public</span>
                    <p className="text-xs text-gray-500">Anyone with the join code can join</p>
                  </div>
                </label>

                {/* Private */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition ${formState.isPrivate
                      ? "border-amber-400 bg-amber-50"
                      : "border-amber-200 hover:border-amber-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    checked={formState.isPrivate}
                    onChange={() => setFormState((prev) => ({ ...prev, isPrivate: true }))}
                    className="h-4 w-4 text-amber-500"
                  />
                  <Lock className="h-4 w-4 text-amber-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Private</span>
                    <p className="text-xs text-gray-500">Requires admin approval</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions - Compact */}
          <div className="mt-5 flex items-center justify-between border-t border-amber-100 pt-4">
            {/* Decorative icons */}
            <div className="hidden sm:flex items-center gap-2">
              {[RedEnvelopeIcon, LanternIcon, HorseIcon, ApricotBlossomIcon, PeachBlossomIcon].map((Icon, i) => (
                <Icon key={i} className={`h-4 w-4 ${i % 2 === 0 ? 'text-red-400' : 'text-amber-400'} opacity-50`} />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                disabled={isLoading}
              >
                  Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:shadow-lg disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <HorseIcon className="h-4 w-4" />
                    <span>Create Workspace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
