import { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useNavigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import UserMenu from "./UserMenu";
import CreateChannelModal from "./CreateChannelModal";
import JoinChannelModal from "./JoinChannelModal";
import DirectMessageList from "./DirectMessageList";
import SearchBar from "./SearchBar";
import WorkspaceSettings from "./WorkspaceSettings";
import WorkspaceMembers from "./WorkspaceMembers";
import JoinRequests from "./JoinRequests";

function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const { authFetch } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isJoinChannelOpen, setIsJoinChannelOpen] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState(null); // 'settings', 'members', 'requests', null

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  // Auto close admin panel when navigating to channel or DM
  useEffect(() => {
    if (
      location.pathname.includes("/channel/") ||
      location.pathname.includes("/dm/")
    ) {
      setAdminPanelTab(null);
    }
  }, [location.pathname]);

  const fetchData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      // Use authFetch instead of request directly
      const [workspaceData, channelsData] = await Promise.all([
        authFetch(`/api/workspaces/${workspaceId}`),
        authFetch(`/api/channels?workspaceId=${workspaceId}`),
      ]);
      setWorkspace(workspaceData);
      setChannels(channelsData);
    } catch (err) {
      console.error("Failed to fetch workspace data", err);
      if (!silent) setError(err.message || "Có lỗi xảy ra khi tải dữ liệu");
      // If 403 or 404, maybe redirect to home
      if (err.status === 403 || err.status === 404) {
        navigate("/workspaces");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleCreateChannelSuccess = (newChannel) => {
    setChannels([...channels, newChannel]);
    setIsCreateChannelOpen(false);
    navigate(`/workspace/${workspaceId}/channel/${newChannel.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-white">
        <p className="text-red-500 text-xl font-bold">Lỗi: {error}</p>
        <button
          onClick={() => navigate("/workspaces")}
          className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Global Header - HUST Collab Platform */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-white whitespace-nowrap">
              HUST Collab Platform
            </h1>

            {/* Search Bar - Only in workspace */}
            <div className="flex-1 max-w-2xl">
              <SearchBar />
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-64 flex-col bg-slate-900 text-slate-300">
          {/* Workspace Header */}
          <div className="relative border-b border-slate-800">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/workspaces")}
                className="px-3 py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Back to workspaces"
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
              <div className="flex flex-1 items-center justify-between px-2 py-3 transition hover:bg-slate-800 focus:outline-none">
                <h1 className="truncate text-lg font-bold text-white">
                  {workspace.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Channels List */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            {/* Channels Section Header */}
            <div className="mb-2 flex items-center justify-between px-2">
              <button className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-200">
                <svg
                  className="mr-1 h-3 w-3 transition"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                Channels
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => setIsJoinChannelOpen(true)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Join Channel"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
                {(workspace.myRole === "WORKSPACE_ADMIN" ||
                  workspace.myRole === "WORKSPACE_PRIVILEGE_MEMBER") && (
                  <button
                    onClick={() => setIsCreateChannelOpen(true)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    title="Create Channel"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Channel Items */}
            <div className="space-y-0.5">
              {channels.map((channel) => {
                const isActive = location.pathname.includes(
                  `/channel/${channel.id}`
                );
                return (
                  <Link
                    key={channel.id}
                    to={`/workspace/${workspaceId}/channel/${channel.id}`}
                    className={`group flex items-center rounded px-2 py-1 transition ${
                      isActive
                        ? "bg-blue-700 text-white"
                        : "hover:bg-slate-800 hover:text-slate-100"
                    }`}
                  >
                    <span className="mr-2 text-slate-400 group-hover:text-slate-300">
                      {channel.isPrivate ? "🔒" : "#"}
                    </span>
                    <span className="truncate">{channel.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-slate-800" />

            {/* Direct Messages Section */}
            <DirectMessageList
              workspaceId={workspaceId}
              onStartNewConversation={(conversation) => {
                navigate(`/workspace/${workspaceId}/dm/${conversation.id}`);
              }}
            />
          </div>

          {/* Admin Buttons at Bottom - Horizontal Icons */}
          <div className="border-t border-slate-800 flex items-center justify-around px-3 py-4">
            <button
              onClick={() => setAdminPanelTab("settings")}
              title="Cài đặt chung"
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition ${
                adminPanelTab === "settings"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            <button
              onClick={() => setAdminPanelTab("members")}
              title="Thành Viên"
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition ${
                adminPanelTab === "members"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </button>

            {workspace?.myRole === "WORKSPACE_ADMIN" && (
              <button
                onClick={() => setAdminPanelTab("requests")}
                title="Yêu cầu tham gia"
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition ${
                  adminPanelTab === "requests"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
          {adminPanelTab ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Admin Panel Header */}
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {adminPanelTab === "settings" &&
                      "⚙️ Cài đặt thông tin chung"}
                    {adminPanelTab === "members" && "👥 Thành Viên"}
                    {adminPanelTab === "requests" && "📋 Yêu cầu tham gia"}
                  </h2>
                  <button
                    onClick={() => setAdminPanelTab(null)}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
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
              </div>

              {/* Admin Panel Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {adminPanelTab === "settings" && (
                  <WorkspaceSettings
                    workspace={workspace}
                    workspaceId={workspaceId}
                    isAdmin={workspace?.myRole === "WORKSPACE_ADMIN"}
                    onClose={() => setAdminPanelTab(null)}
                  />
                )}
                {adminPanelTab === "members" && (
                  <WorkspaceMembers
                    workspaceId={workspaceId}
                    isAdmin={workspace?.myRole === "WORKSPACE_ADMIN"}
                  />
                )}
                {adminPanelTab === "requests" &&
                  workspace?.myRole === "WORKSPACE_ADMIN" && (
                    <JoinRequests workspaceId={workspaceId} />
                  )}
              </div>
            </div>
          ) : (
            <Outlet
              context={{ workspace, refreshChannels: () => fetchData(true) }}
            />
          )}
        </main>
      </div>

      {/* Create Channel Modal */}
      {isCreateChannelOpen && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setIsCreateChannelOpen(false)}
          onSuccess={handleCreateChannelSuccess}
        />
      )}

      {isJoinChannelOpen && (
        <JoinChannelModal
          onClose={() => setIsJoinChannelOpen(false)}
          onSuccess={() => {
            // Refresh channel list silently
            fetchData(true);
          }}
        />
      )}
    </div>
  );
}

export default WorkspaceLayout;
