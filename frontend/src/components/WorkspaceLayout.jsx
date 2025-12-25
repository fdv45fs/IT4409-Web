import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import UserMenu from "./UserMenu";
import CreateChannelModal from "./CreateChannelModal";
import JoinChannelModal from "./JoinChannelModal";
import DirectMessageList from "./DirectMessageList";
import SearchBar from "./SearchBar";

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
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

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
    <>
      {/* Global Header - HUST Collab Platform */}
      <header className="border-b border-slate-800 bg-slate-900">
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
      <div className="flex h-screen overflow-hidden">
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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex flex-1 items-center justify-between px-2 py-3 transition hover:bg-slate-800 focus:outline-none"
            >
              <h1 className="truncate text-lg font-bold text-white">
                {workspace.name}
              </h1>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Workspace Menu Dropdown */}
          {isWorkspaceMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setIsWorkspaceMenuOpen(false)}
              ></div>
              <div className="absolute left-2 right-2 top-12 z-20 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">Current Workspace</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{workspace.name}</p>
                </div>
                
                {workspace.joinCode && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(workspace.joinCode);
                      setIsWorkspaceMenuOpen(false);
                      addToast("Đã sao chép mã tham gia vào clipboard", "success");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sao chép mã tham gia
                  </button>
                )}

                <button
                  onClick={() => {
                    navigate(`/workspace/${workspaceId}/admin`);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Quản lý Workspace
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={() => {
                    navigate("/workspaces");
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Chuyển Workspace
                </button>
              </div>
            </>
          )}
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
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                </button>
                {(workspace.myRole === 'WORKSPACE_ADMIN' || workspace.myRole === 'WORKSPACE_PRIVILEGE_MEMBER') && (
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
              const isActive = location.pathname.includes(`/channel/${channel.id}`);
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
         <Outlet context={{ workspace, refreshChannels: () => fetchData(true) }} />
      </main>

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
    </>
  );
}

export default WorkspaceLayout;
