import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth.js";
import { useToast } from "../contexts/ToastContext";

function WorkspaceSettings({ workspace, workspaceId, isAdmin, onClose }) {
  const { authFetch } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", content: "" });

  useEffect(() => {
    if (workspace) {
      setFormData({
        name: workspace.name,
        description: workspace.description || "",
        isPrivate: workspace.isPrivate,
      });
    }
  }, [workspace]);

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ type: "", content: "" });

    try {
      await authFetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      setSaveMessage({ type: "success", content: "Cập nhật thành công!" });
    } catch (err) {
      setSaveMessage({
        type: "error",
        content: err.message || "Lỗi khi cập nhật",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa Workspace này? Hành động này không thể hoàn tác!"
      )
    ) {
      return;
    }

    try {
      await authFetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      addToast("Workspace đã bị xóa", "success");
      onClose();
      // Navigate will be handled by parent or route
    } catch (err) {
      addToast(err.message || "Lỗi khi xóa workspace", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {!isAdmin && (
        <div className="rounded-md border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Chế độ chỉ xem:</strong> Bạn là thành viên workspace. Để
            chỉnh sửa cài đặt, hãy liên hệ với quản trị viên.
          </p>
        </div>
      )}

      {/* Update Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Thông tin Workspace
        </h3>

        {saveMessage.content && (
          <div
            className={`mb-4 rounded-md p-4 ${
              saveMessage.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {saveMessage.content}
          </div>
        )}

        <form onSubmit={handleUpdateWorkspace} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tên Workspace
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={!isAdmin}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${
                isAdmin
                  ? "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  : "bg-gray-50 text-gray-500 cursor-not-allowed"
              }`}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              disabled={!isAdmin}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${
                isAdmin
                  ? "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  : "bg-gray-50 text-gray-500 cursor-not-allowed"
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={formData.isPrivate}
              onChange={(e) =>
                setFormData({ ...formData, isPrivate: e.target.checked })
              }
              disabled={!isAdmin}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <label htmlFor="isPrivate" className="text-sm text-gray-700">
              Workspace riêng tư (Cần duyệt thành viên)
            </label>
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-medium text-red-600">
            Vùng nguy hiểm
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Xóa workspace sẽ xóa vĩnh viễn tất cả channel, tin nhắn và dữ liệu
            liên quan. Hành động này không thể hoàn tác.
          </p>
          <button
            onClick={handleDeleteWorkspace}
            className="rounded-md border border-red-600 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Xóa Workspace
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceSettings;
