import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { useToast } from "../contexts/ToastContext";
import WorkspaceMembers from "../components/WorkspaceMembers.jsx";
import JoinRequests from "../components/JoinRequests.jsx";
import {
  TetThemeWrapper,
  TetHeader,
  HorseIcon,
  LanternIcon,
  RedEnvelopeIcon,
  SparkleDecor,
} from "../components/tet";
import {
  ArrowLeft,
  Settings,
  Users,
  UserPlus,
  Copy,
  Check,
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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
      setTimeout(() => setSaveMessage({ type: "", content: "" }), 3000);
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
      addToast("Đã xóa workspace thành công", "success");
      navigate("/workspaces");
    } catch (err) {
      addToast(err.message || "Lỗi khi xóa workspace", "error");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <TetThemeWrapper showFireworksToggle={false}>
        <TetHeader />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-amber-200 border-t-red-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <HorseIcon className="h-8 w-8 text-red-500 animate-heartbeat" />
              </div>
            </div>
            <p className="mt-6 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </TetThemeWrapper>
    );
  }

  // Error state
  if (error) {
    return (
      <TetThemeWrapper showFireworksToggle={false}>
        <TetHeader />
        <div className="flex items-center justify-center py-32">
          <div className="mx-4 max-w-md rounded-2xl border-2 border-red-300 bg-white px-8 py-6 text-center shadow-xl">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 text-red-700">{error}</p>
            <button
              onClick={() => navigate("/workspaces")}
              className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách workspace
            </button>
          </div>
        </div>
      </TetThemeWrapper>
    );
  }

  const tabs = [
    ...(workspace?.myRole === 'WORKSPACE_ADMIN' ? [
      { key: 'settings', label: 'Cài đặt chung', icon: Settings }
    ] : []),
    { key: 'members', label: 'Thành viên', icon: Users },
    ...(workspace?.myRole === 'WORKSPACE_ADMIN' ? [
      { key: 'requests', label: 'Yêu cầu tham gia', icon: UserPlus }
    ] : []),
  ];

  return (
    <TetThemeWrapper showFireworksToggle={false}>
      <TetHeader />

      {/* Page Header */}
      <div className="relative z-10 border-b border-amber-200/50 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/workspaces")}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-gray-600 shadow-md transition hover:bg-white hover:text-red-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{workspace?.name}</h1>
                <p className="text-sm text-amber-600">Quản lý Workspace</p>
              </div>
            </div>

            {/* Join Code */}
            {workspace?.joinCode && (
              <div className="flex items-center gap-3">
                <div className="relative overflow-hidden rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2">
                  <div className="text-right">
                    <p className="text-xs text-amber-600">Mã tham gia</p>
                    <p className="font-mono text-lg font-bold text-gray-900">{workspace.joinCode}</p>
                  </div>
                  <SparkleDecor className="-right-1 -top-1" />
                </div>
                <button
                  onClick={handleCopyJoinCode}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${copied
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg shadow-red-200 hover:shadow-xl'
                    }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 border-b border-amber-200/50 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-medium transition ${activeTab === tab.key
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:border-amber-300 hover:text-amber-700"
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-6">
        {activeTab === "settings" && workspace?.myRole === 'WORKSPACE_ADMIN' && (
          <div className="space-y-6">
            {/* Update Form */}
            <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white/90 shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>
              <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100">
                    <Settings className="h-5 w-5 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Thông tin Workspace</h2>
                </div>

                {saveMessage.content && (
                  <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 ${saveMessage.type === "success"
                      ? "border-2 border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-2 border-red-300 bg-red-50 text-red-700"
                    }`}>
                    {saveMessage.type === "success" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span>{saveMessage.content}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateWorkspace} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Tên Workspace</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={formData.isPrivate}
                      onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                      className="h-4 w-4 rounded border-amber-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="isPrivate" className="text-sm text-gray-700">
                      Workspace riêng tư (Cần duyệt thành viên)
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:shadow-xl disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="overflow-hidden rounded-2xl border-2 border-red-300 bg-white/90 shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600"></div>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-red-600">Vùng nguy hiểm</h2>
                    <p className="text-sm text-gray-600">Hành động này không thể hoàn tác</p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-gray-600">
                  Xóa workspace sẽ xóa vĩnh viễn tất cả channel, tin nhắn và dữ liệu liên quan.
                </p>

                <button
                  onClick={handleDeleteWorkspace}
                  className="flex items-center gap-2 rounded-xl border-2 border-red-500 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa Workspace</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white/90 shadow-xl">
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>
            <WorkspaceMembers
              workspaceId={workspaceId}
              isAdmin={workspace?.myRole === 'WORKSPACE_ADMIN'}
            />
          </div>
        )}

        {activeTab === "requests" && workspace?.myRole === 'WORKSPACE_ADMIN' && (
          <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white/90 shadow-xl">
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>
            <JoinRequests workspaceId={workspaceId} />
          </div>
        )}
      </main>
    </TetThemeWrapper>
  );
}

export default WorkspaceAdmin;
