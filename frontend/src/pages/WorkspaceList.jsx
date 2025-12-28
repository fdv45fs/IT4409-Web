import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal.jsx";
import JoinWorkspaceModal from "../components/JoinWorkspaceModal.jsx";

// Lucide icons
import {
  PartyPopper,
  Star,
  Users,
  Plus,
  UserPlus,
  Settings,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Tet Theme Components
import {
  TetThemeWrapper,
  TetHeader,
  LanternIcon,
  HorseIcon,
  RedEnvelopeIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
  CoinIcon,
  FireworkIcon,
  SparkleDecor,
} from "../components/tet";

function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await authFetch("/api/workspaces");
      setWorkspaces(data);
    } catch (err) {
      let errorMsg = err.message || "Cannot load workspace list";

      if (err.status === 401) {
        errorMsg = "Session expired. Please sign in again.";
      } else if (err.status === 500) {
        errorMsg = "Server error loading workspaces. Please try again later.";
      }

      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleWorkspaceClick = (workspaceId) => {
    navigate(`/workspace/${workspaceId}`);
  };

  const handleCreateSuccess = (newWorkspace) => {
    setWorkspaces([newWorkspace, ...workspaces]);
    setIsCreateModalOpen(false);
  };

  const handleJoinSuccess = (result) => {
    setIsJoinModalOpen(false);
    if (result.status === "APPROVED") {
      fetchWorkspaces();
      setSuccessMessage(
        `Successfully joined workspace "${result.workspaceName}"!`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } else {
      setSuccessMessage(
        `Request to join workspace "${result.workspaceName}" is pending approval`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  // Icon decorations for headers
  const decorativeIcons = [
    { Icon: RedEnvelopeIcon, color: "text-red-500" },
    { Icon: LanternIcon, color: "text-red-500" },
    { Icon: HorseIcon, color: "text-amber-600" },
    { Icon: ApricotBlossomIcon, color: "text-yellow-500" },
    { Icon: PeachBlossomIcon, color: "text-pink-400" },
    { Icon: CoinIcon, color: "text-amber-500" },
  ];

  return (
    <TetThemeWrapper>
      {/* Header */}
      <TetHeader />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 lg:px-20">
        {/* Welcome Section */}
        <div className="mb-12 text-center animate-zoom-bounce">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-red-100 via-amber-100 to-yellow-100 px-6 py-3 text-sm font-medium text-red-700 ring-2 ring-red-200 shadow-lg shadow-red-100">
            <LanternIcon className="h-5 w-5 animate-swing text-red-500" />
            <span>Year 2026</span>
            <LanternIcon
              className="h-5 w-5 animate-swing text-red-500"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          {/* Title */}
          <h1 className="mt-6 text-5xl font-bold lg:text-6xl">
            <span className="animate-rainbow-text">Happy New Year!</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
            Choose a workspace to start working with your team.
            <br />
            Wishing you prosperity and success in the new year!
          </p>

          {/* Decorative Icons */}
          <div className="mt-6 flex justify-center gap-5">
            {decorativeIcons.map(({ Icon, color }, i) => (
              <Icon
                key={i}
                className={`h-7 w-7 ${color} animate-bounce`}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "2s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-4 text-emerald-700 shadow-xl shadow-emerald-100 animate-zoom-bounce">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 animate-heartbeat" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 px-5 py-4 text-red-700 shadow-xl shadow-red-100 animate-zoom-bounce">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative mx-auto h-24 w-24">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-4 border-amber-200 border-t-red-500"
                  style={{ animationDuration: "1s" }}
                ></div>
                <div
                  className="absolute inset-3 animate-spin rounded-full border-4 border-yellow-200 border-t-amber-500"
                  style={{
                    animationDirection: "reverse",
                    animationDuration: "1.5s",
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <HorseIcon className="h-10 w-10 text-red-500 animate-heartbeat" />
                </div>
              </div>
              <p className="mt-8 text-xl font-medium text-gray-700">
                Loading workspaces...
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <ApricotBlossomIcon className="h-6 w-6 text-yellow-500 animate-bloom" />
                <LanternIcon className="h-6 w-6 text-red-500 animate-swing" />
                <PeachBlossomIcon
                  className="h-6 w-6 text-pink-400 animate-bloom"
                  style={{ animationDelay: "0.5s" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Workspaces Grid */}
        {!isLoading && workspaces.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-amber-700">
              <ApricotBlossomIcon className="h-5 w-5 text-yellow-500 animate-bloom" />
              <span>Your Workspaces ({workspaces.length})</span>
              <PeachBlossomIcon
                className="h-5 w-5 text-pink-400 animate-bloom"
                style={{ animationDelay: "0.5s" }}
              />
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace, index) => (
                <div
                  key={workspace.id}
                  className="group relative overflow-hidden rounded-2xl border-2 border-amber-200/70 bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-500 hover:border-red-400 hover:shadow-2xl hover:shadow-red-200 hover:-translate-y-2 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Top gradient */}
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 animate-shimmer"></div>

                  {/* Hover decorations */}
                  <div className="absolute -right-4 -top-4 h-8 w-8 rotate-45 bg-gradient-to-br from-yellow-400 to-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-red-100/0 to-amber-100/0 transition-all duration-300 group-hover:from-red-100/20 group-hover:to-amber-100/20"></div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleWorkspaceClick(workspace.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleWorkspaceClick(workspace.id);
                      }
                    }}
                    className="relative flex w-full flex-col p-5 text-left"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-amber-500 to-yellow-500 text-xl font-bold text-white shadow-lg shadow-amber-300 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                          {workspace.avatarUrl ? (
                            <img
                              src={workspace.avatarUrl}
                              alt={workspace.name}
                              className="h-full w-full rounded-xl object-cover"
                            />
                          ) : (
                            workspace.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <SparkleDecor className="-right-2 -top-2" />
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/${workspace.id}/admin`);
                        }}
                        className="rounded-lg p-2 text-amber-400 opacity-0 transition-all hover:bg-amber-50 hover:text-red-600 hover:rotate-90 group-hover:opacity-100"
                        title="Manage workspace"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600">
                      {workspace.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-600/80">
                      <Users className="h-4 w-4" />
                      <span>{workspace.memberCount} members</span>
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-red-600 opacity-0 group-hover:opacity-100">
                      <HorseIcon className="h-4 w-4 animate-bounce" />
                      <span>Open workspace</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && workspaces.length === 0 && !error && (
          <div className="mx-auto mb-12 max-w-md overflow-hidden rounded-3xl border-2 border-amber-300 bg-white shadow-2xl animate-zoom-bounce">
            <div className="relative bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 px-8 py-8 text-center text-white overflow-hidden">
              <PartyPopper className="relative mx-auto h-16 w-16 mb-3 animate-heartbeat" />
              <h3 className="relative text-2xl font-bold">
                No workspaces yet
              </h3>
            </div>
            <div className="p-8 text-center bg-gradient-to-b from-white to-amber-50">
              <p className="text-gray-600 mb-4">
                Create a new workspace or join one to start the new year!
              </p>
              <div className="flex justify-center gap-4">
                {[
                  ApricotBlossomIcon,
                  LanternIcon,
                  HorseIcon,
                  PeachBlossomIcon,
                  CoinIcon,
                ].map((Icon, i) => (
                  <Icon
                    key={i}
                    className={`h-7 w-7 ${
                      i % 2 === 0 ? "text-yellow-500" : "text-red-500"
                    } animate-bounce`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        {!isLoading && workspaces.length > 0 && (
          <div className="relative my-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-amber-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gradient-to-r from-red-50 via-amber-50 to-yellow-50 px-6 flex items-center gap-4">
                <ApricotBlossomIcon className="h-5 w-5 text-yellow-500 animate-bloom" />
                <span className="text-sm font-bold uppercase tracking-wider text-amber-700">
                  OR
                </span>
                <PeachBlossomIcon className="h-5 w-5 text-pink-400 animate-bloom" />
              </span>
            </div>
          </div>
        )}

        {/* Create or Join */}
        <div className={`${!isLoading && workspaces.length > 0 ? "" : "mt-8"}`}>
          <h2 className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-amber-700">
            <RedEnvelopeIcon
              className="h-5 w-5 text-red-500 animate-bounce"
              style={{ animationDuration: "2s" }}
            />
            <span>Create or Join Workspace</span>
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Create Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-white/80 to-amber-50/80 p-8 transition-all duration-500 hover:border-red-400 hover:from-red-50 hover:to-amber-100 hover:shadow-2xl hover:-translate-y-2"
            >
              <div className="absolute -left-6 -top-6 h-12 w-12 rotate-45 bg-amber-200/50 group-hover:bg-red-200/50 group-hover:scale-150 transition-all"></div>

              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 group-hover:from-red-100 group-hover:to-amber-100 group-hover:scale-110 transition-all">
                <Plus className="h-10 w-10 text-amber-500 group-hover:text-red-600 transition-colors" />
                <SparkleDecor className="-right-1 -top-1" />
              </div>

              <span className="mt-5 text-lg font-bold text-gray-900 group-hover:text-red-700">
                Create new workspace
              </span>
              <span className="mt-2 flex items-center gap-2 text-sm text-amber-600/80">
                <span>Initialize work space</span>
                <Star className="h-4 w-4 text-yellow-500 animate-sparkle" />
              </span>
            </button>

            {/* Join Button */}
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-red-300 bg-gradient-to-br from-red-50/80 to-amber-50/80 p-8 transition-all duration-500 hover:border-red-500 hover:from-red-100 hover:to-amber-100 hover:shadow-2xl hover:-translate-y-2"
            >
              <div className="absolute -right-6 -top-6 h-12 w-12 rotate-45 bg-red-200/50 group-hover:scale-150 transition-all"></div>

              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-amber-100 group-hover:from-red-200 group-hover:to-amber-200 group-hover:scale-110 transition-all">
                <UserPlus className="h-10 w-10 text-red-500 group-hover:text-red-700 transition-colors" />
                <SparkleDecor className="-left-1 -top-1" delay="0.5s" />
              </div>

              <span className="mt-5 text-lg font-bold text-gray-900 group-hover:text-red-700">
                Join with code
              </span>
              <span className="mt-2 flex items-center gap-2 text-sm text-red-600/80">
                <span>Enter invite code to join</span>
                <RedEnvelopeIcon className="h-4 w-4 text-red-500 animate-bounce" />
              </span>
            </button>
          </div>
        </div>

        {/* Footer Greeting */}
        <div className="mt-20 text-center">
          <div className="mx-auto inline-block overflow-hidden rounded-3xl bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 p-1 shadow-2xl shadow-amber-300 animate-glow-pulse">
            <div className="rounded-[22px] bg-white/95 px-10 py-6">
              <div className="flex items-center justify-center gap-4">
                <LanternIcon className="h-10 w-10 text-red-500 animate-swing" />
                <div>
                  <p className="text-xl font-bold animate-rainbow-text">
                    Happy New Year 2026
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-2 text-sm text-amber-700 font-medium">
                    <HorseIcon className="h-4 w-4" />
                    <span>Peace, Prosperity and Success</span>
                    <HorseIcon className="h-4 w-4" />
                  </p>
                </div>
                <LanternIcon
                  className="h-10 w-10 text-red-500 animate-swing"
                  style={{ animationDelay: "1.5s" }}
                />
              </div>
              <div className="mt-4 flex justify-center gap-4">
                {[
                  ApricotBlossomIcon,
                  RedEnvelopeIcon,
                  CoinIcon,
                  PeachBlossomIcon,
                  FireworkIcon,
                ].map((Icon, i) => (
                  <Icon
                    key={i}
                    className={`h-6 w-6 ${
                      i % 2 === 0 ? "text-yellow-500" : "text-red-500"
                    } animate-bounce`}
                    style={{
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: "2s",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateWorkspaceModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {isJoinModalOpen && (
        <JoinWorkspaceModal
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={handleJoinSuccess}
        />
      )}
    </TetThemeWrapper>
  );
}

export default WorkspaceList;
