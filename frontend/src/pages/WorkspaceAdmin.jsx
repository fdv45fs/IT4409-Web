import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { useToast } from "../contexts/ToastContext";
import WorkspaceMembers from "../components/WorkspaceMembers.jsx";
import JoinRequests from "../components/JoinRequests.jsx";

function WorkspaceAdmin() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("settings");
  const [copied, setCopied] = useState(false);
  const { authFetch } = useAuth();
  const { addToast } = useToast();

  // Form states for settings
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", content: "" });

  const handleCopyJoinCode = async () => {
    if (workspace?.joinCode) {
      try {
        await navigator.clipboard.writeText(workspace.joinCode);
        setCopied(true);
        addToast("Đã sao chép mã tham gia vào clipboard", "success");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        addToast("Không thể sao chép mã", "error");
      }
    }
  };

  const fetchWorkspace = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await authFetch(`/api/workspaces/${workspaceId}`);
      setWorkspace(data);
      setFormData({
        name: data.name,
        description: data.description || "",
        isPrivate: data.isPrivate,
      });
    } catch (err) {
      setError(err.message || "Không thể tải thông tin workspace");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspace && workspace.myRole !== 'WORKSPACE_ADMIN') {
      setActiveTab('members');
    }
  }, [workspace]);

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ type: "", content: "" });

    try {
      const updated = await authFetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      setWorkspace(updated);
      setSaveMessage({ type: "success", content: "Cập nhật thành công!" });
    } catch (err) {
      setSaveMessage({ type: "error", content: err.message || "Lỗi khi cập nhật" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Workspace này? Hành động này không thể hoàn tác!")) {
      return;
    }

    try {
      await authFetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      navigate("/workspaces");
    } catch (err) {
      alert(err.message || "Lỗi khi xóa workspace");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate("/workspaces")}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            Quay lại danh sách workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/workspaces")}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {workspace?.name}
                </h1>
                <p className="text-sm text-gray-500">Quản lý Workspace</p>
              </div>
            </div>

            {/* Join Code Display */}
            {workspace?.joinCode && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Mã tham gia</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {workspace.joinCode}
                  </p>
                </div>
                <button
                  onClick={handleCopyJoinCode}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Đã sao chép
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Sao chép
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-8">
            {workspace?.myRole === 'WORKSPACE_ADMIN' && (
              <button
                onClick={() => setActiveTab("settings")}
                className={`border-b-2 py-4 text-sm font-medium transition ${
                  activeTab === "settings"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Cài đặt chung
              </button>
            )}
            <button
              onClick={() => setActiveTab("members")}
              className={`border-b-2 py-4 text-sm font-medium transition ${
                activeTab === "members"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Thành viên
            </button>
            {workspace?.myRole === 'WORKSPACE_ADMIN' && (
              <button
                onClick={() => setActiveTab("requests")}
                className={`border-b-2 py-4 text-sm font-medium transition ${
                  activeTab === "requests"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Yêu cầu tham gia
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === "settings" && workspace?.myRole === 'WORKSPACE_ADMIN' && (
          <div className="space-y-6">
            {/* Update Form */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Thông tin Workspace</h2>
              
              {saveMessage.content && (
                <div className={`mb-4 rounded-md p-4 ${
                  saveMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {saveMessage.content}
                </div>
              )}

              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên Workspace</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-700">
                    Workspace riêng tư (Cần duyệt thành viên)
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-medium text-red-600">Vùng nguy hiểm</h2>
              <p className="mb-4 text-sm text-gray-600">
                Xóa workspace sẽ xóa vĩnh viễn tất cả channel, tin nhắn và dữ liệu liên quan. Hành động này không thể hoàn tác.
              </p>
              <button
                onClick={handleDeleteWorkspace}
                className="rounded-md border border-red-600 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Xóa Workspace
              </button>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <WorkspaceMembers 
            workspaceId={workspaceId} 
            isAdmin={workspace?.myRole === 'WORKSPACE_ADMIN'}
          />
        )}
        {activeTab === "requests" && workspace?.myRole === 'WORKSPACE_ADMIN' && (
          <JoinRequests workspaceId={workspaceId} />
        )}
      </main>
    </div>
  );
}

export default WorkspaceAdmin;
