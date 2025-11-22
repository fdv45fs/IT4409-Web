import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { getChannels } from "../api";
import useAuth from "../hooks/useAuth";
import UserMenu from "./UserMenu";
import CreateChannelModal from "./CreateChannelModal";

function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { authFetch } = useAuth(); // Use authFetch from useAuth
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
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
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu");
      // If 403 or 404, maybe redirect to home
      if (err.status === 403 || err.status === 404) {
          navigate("/workspaces");
      }
    } finally {
      setIsLoading(false);
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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-900 text-slate-300">
        {/* Workspace Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 transition hover:bg-slate-800">
          <h1 className="truncate text-lg font-bold text-white">
            {workspace.name}
          </h1>
          <button 
            className="rounded p-1 hover:bg-slate-700"
            onClick={() => navigate("/workspaces")}
            title="Back to Workspaces"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
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
        </div>

        {/* User Menu */}
        <div className="border-t border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="flex items-center justify-between">
             <UserMenu />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
         <Outlet context={{ workspace }} />
      </main>

      {/* Create Channel Modal */}
      {isCreateChannelOpen && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setIsCreateChannelOpen(false)}
          onSuccess={handleCreateChannelSuccess}
        />
      )}
    </div>
  );
}

export default WorkspaceLayout;
