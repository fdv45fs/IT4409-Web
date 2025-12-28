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
import { useMeetingContext } from "../contexts/MeetingContext";
import UserMenu from "./UserMenu";
import CreateChannelModal from "./CreateChannelModal";
import JoinChannelModal from "./JoinChannelModal";
import DirectMessageList from "./DirectMessageList";
import SearchBar from "./SearchBar";
import WorkspaceSettings from "./WorkspaceSettings";
import WorkspaceMembers from "./WorkspaceMembers";
import JoinRequests from "./JoinRequests";
import "./WorkspaceLayout.css";

function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const { authFetch } = useAuth();
  const { addToast } = useToast();
  const { isInMeeting } = useMeetingContext();
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
      if (!silent) setError(err.message || "An error occurred while loading data");
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
        <p className="text-red-500 text-xl font-bold">Error: {error}</p>
        <button
          onClick={() => navigate("/workspaces")}
          className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Global Header - HUST Collab Platform */}
      <header
        className={`flex-shrink-0 border-b border-slate-800 bg-slate-900 transition ${
          isInMeeting ? "pointer-events-none opacity-80" : ""
        }`}
      >
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
        <aside
          className={`flex w-64 flex-col bg-slate-900 text-slate-300 transition ${
            isInMeeting ? "pointer-events-none opacity-80" : ""
          }`}
        >
          {/* Workspace Header */}
          <div className="relative border-b border-slate-800">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/workspaces")}
                className="px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
              <div className="flex flex-1 items-center justify-between px-2 py-2.5 transition hover:bg-slate-800 focus:outline-none">
                <h1 className="truncate text-lg font-bold text-white">
                  {workspace.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Channels List */}
          <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
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
                    <span className="mr-2 text-slate-400 group-hover:text-slate-300 flex items-center justify-center">
                      {channel.isPrivate ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M4 6V4C4 1.79086 5.79086 0 8 0C10.2091 0 12 1.79086 12 4V6H14V16H2V6H4ZM6 4C6 2.89543 6.89543 2 8 2C9.10457 2 10 2.89543 10 4V6H6V4ZM7 13V9H9V13H7Z"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 64 64"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M32,0C15.776,0,2.381,12.077,0.292,27.729c-0.002,0.016-0.004,0.031-0.006,0.047 c-0.056,0.421-0.106,0.843-0.146,1.269c-0.019,0.197-0.029,0.396-0.045,0.594c-0.021,0.28-0.044,0.56-0.058,0.842 C0.014,30.983,0,31.49,0,32c0,17.673,14.327,32,32,32s32-14.327,32-32S49.673,0,32,0z M33.362,58.502 c-0.72,0.787-1.901,1.414-2.675,0.67c-0.653-0.644-0.099-1.44,0-2.353c0.125-1.065-0.362-2.345,0.666-2.676 c0.837-0.259,1.468,0.322,2.009,1.012C34.187,56.175,34.239,57.526,33.362,58.502z M43.446,49.87 c-1.18,0.608-2.006,0.494-3.323,0.673c-2.454,0.309-4.394,1.52-6.333,0c-0.867-0.695-0.978-1.451-1.65-2.341 c-1.084-1.364-1.355-3.879-3.01-3.322c-1.058,0.356-1.026,1.415-1.654,2.335c-0.81,1.156-0.607,2.793-2.005,2.993 c-0.974,0.138-1.499-0.458-2.321-1c-0.922-0.614-1.104-1.348-2.002-1.993c-0.934-0.689-1.69-0.693-2.654-1.334 c-0.694-0.463-0.842-1.304-1.673-1.334c-0.751-0.022-1.289,0.346-1.664,0.996c-0.701,1.214-0.942,4.793-2.988,4.665 c-1.516-0.103-4.758-3.509-5.994-4.327c-0.405-0.273-0.78-0.551-1.158-0.763c-1.829-3.756-2.891-7.952-2.997-12.385 c0.614-0.515,1.239-0.769,1.819-1.493c0.927-1.13,0.481-2.507,1.673-3.335c0.886-0.604,1.602-0.507,2.669-0.658 c1.529-0.222,2.491-0.422,3.988,0c1.459,0.409,2.016,1.246,3.326,1.992c1.415,0.81,2.052,1.766,3.66,2.001 c1.166,0.165,1.966-0.901,2.988-0.337c0.824,0.458,1.406,1.066,1.341,2.001c-0.1,1.218-2.522,0.444-2.659,1.662 c-0.183,1.558,2.512-0.194,3.992,0.33c0.974,0.355,2.241,0.294,2.325,1.334c0.081,1.156-1.608,0.837-2.657,1.335 c-1.162,0.541-1.771,0.996-3.004,1.329c-1.125,0.298-2.312-0.628-2.987,0.329c-0.53,0.742-0.343,1.489,0,2.335 c0.787,1.931,3.349,1.352,5.322,0.657c1.383-0.488,1.641-1.726,2.997-2.329c1.438-0.641,2.554-1.335,3.981-0.663 c1.178,0.556,0.849,2.05,2.006,2.663c1.253,0.668,2.432-0.729,3.663,0c0.957,0.569,0.887,1.521,1.655,2.327 c0.894,0.942,1.41,1.702,2.668,2c1.286,0.299,2.072-1.071,3.327-0.671c0.965,0.315,1.755,0.68,1.987,1.672 C46.465,48.634,44.744,49.198,43.446,49.87z M45.839,33.841c-1.154,1.16-2.156,1.539-3.771,1.893c-1.433,0.315-3.443,1.438-3.772,0 c-0.251-1.148,1.029-1.558,1.893-2.359c0.959-0.895,1.854-0.983,2.826-1.892c0.87-0.802,0.756-2.031,1.893-2.359 c1.109-0.32,2.182-0.019,2.825,0.947C48.652,31.438,47.006,32.681,45.839,33.841z M59.989,29.319 c-0.492,0.508-0.462,1.044-0.965,1.542c-0.557,0.539-1.331,0.307-1.738,0.968c-0.358,0.577-0.13,1.057-0.194,1.735 c-0.041,0.387-1.924,1.256-2.313,0.385c-0.214-0.481,0.281-0.907,0-1.353c-0.263-0.401-0.555-0.195-0.899,0.181 c-0.359,0.388-0.772,0.958-1.221,1.172c-0.589,0.273-0.196-2.25-0.395-3.088c-0.146-0.663,0.01-1.08,0.198-1.736 c0.25-0.91,0.938-1.206,1.155-2.125c0.194-0.806,0.033-1.295,0-2.123c-0.039-0.906-0.015-1.427-0.188-2.314 c-0.192-0.937-0.252-1.525-0.771-2.316c-0.418-0.624-0.694-1.001-1.354-1.352c-0.16-0.088-0.31-0.146-0.452-0.191 c-0.34-0.113-0.659-0.128-1.098-0.193c-0.888-0.132-1.522,0.432-2.314,0c-0.462-0.255-0.606-0.575-0.96-0.967 c-0.404-0.434-0.511-0.789-0.967-1.158c-0.341-0.276-0.552-0.437-0.965-0.581c-0.79-0.263-1.342-0.082-2.126,0.196 c-0.77,0.268-1.058,0.707-1.739,1.155c-0.522,0.303-0.893,0.371-1.348,0.774c-0.276,0.242-1.59,1.177-2.127,1.155 c-0.544-0.021-0.851-0.343-1.338-0.382c-0.065-0.008-0.13-0.008-0.204,0c0,0,0,0-0.005,0c-0.473,0.036-0.696,0.269-1.146,0.382 c-1.107,0.276-1.812-0.115-2.905,0.197c-0.712,0.2-0.993,0.766-1.73,0.771c-0.841,0.005-1.125-0.743-1.932-0.968 c-0.442-0.118-0.702-0.129-1.157-0.19c-0.749-0.108-1.178-0.119-1.926-0.191H24.86c-0.016,0.006-0.591,0.058-0.688,0 c-0.422-0.286-0.722-0.521-1.244-0.773c-0.575-0.283-0.919-0.428-1.547-0.584l0.026-0.381c0,0,0-0.847-0.121-1.207 c-0.115-0.361-0.24-0.361,0-1.086c0.248-0.722,0.679-1.182,0.679-1.182c0.297-0.228,0.516-0.305,0.769-0.58 c0.51-0.539,0.717-0.998,0.774-1.739c0.067-0.972-1.205-1.367-0.97-2.316c0.209-0.826,0.904-0.98,1.547-1.543 c0.779-0.67,1.468-0.758,2.12-1.542c0.501-0.593,0.911-0.965,0.97-1.738c0.053-0.657-0.23-1.068-0.57-1.538 C28.356,2.175,30.157,2,32,2c14.919,0,27.29,10.893,29.605,25.158c-0.203,0.352-0.001,0.796-0.27,1.193 C60.979,28.894,60.436,28.85,59.989,29.319z" />
                        </svg>
                      )}
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
          <div className="border-t border-slate-800 flex items-center justify-around px-3 py-3">
            <button
              onClick={() => setAdminPanelTab("settings")}
              title="General Settings"
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
              title="Members"
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
                title="Join Requests"
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
                      "⚙️ General Settings"}
                    {adminPanelTab === "members" && "👥 Members"}
                    {adminPanelTab === "requests" && "📋 Join Requests"}
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
