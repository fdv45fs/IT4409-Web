import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";

function AddWorkspaceMemberModal({ workspaceId, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authFetch } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await authFetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      addToast("Đã thêm thành viên thành công", "success");
      onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || "Lỗi khi thêm thành viên", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Thêm thành viên</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email thành viên
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Đang thêm..." : "Thêm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddWorkspaceMemberModal;
