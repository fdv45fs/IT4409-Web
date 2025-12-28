import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getOrCreateDirectConversation } from "../api";
import { useToast } from "../contexts/ToastContext";
import AddUserToChannelsModal from "./AddUserToChannelsModal";

function UserProfilePage({ user, onClose, workspaceId }) {
  const { currentUser, authFetch } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isAddToChannelsModalOpen, setIsAddToChannelsModalOpen] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!user) return null;

  const isCurrentUser = user.id === currentUser?.id;

  const handleMessageClick = async () => {
    if (!workspaceId) {
      addToast("Cannot determine workspace", "error");
      return;
    }

    setIsCreatingConversation(true);
    try {
      const conversation = await getOrCreateDirectConversation(
        workspaceId,
        user.id,
        authFetch
      );

      // Navigate to the conversation
      navigate(`/workspace/${workspaceId}/dm/${conversation.id}`);
      onClose(); // Close profile panel after navigating
    } catch (err) {
      addToast(err.message || "Failed to create conversation", "error");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleAddToChannelsClick = () => {
    setIsAddToChannelsModalOpen(true);
  };

  return (
    <>
      <div
        className="absolute right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-30"
        style={{
          animation: "slide-in-from-right 0.3s ease-out forwards",
          top: "64px",
          height: "calc(100% - 64px)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-40 w-40 rounded-2xl object-cover border-4 border-gray-100 shadow-lg"
              />
            ) : (
              <div className="h-40 w-40 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-6xl font-bold text-white border-4 border-gray-100 shadow-lg uppercase">
                {user.fullName?.slice(0, 2) || user.username?.slice(0, 2) || "??"}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.fullName || user.username}
                </h2>
                {isCurrentUser && (
                  <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
                    You
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Contact Information
            </h3>

            {/* Email */}
            {user.email && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Email
                  </p>
                  <p className="text-sm text-gray-900 break-all font-medium">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Username */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Username
                </p>
                <p className="text-sm text-gray-900 font-medium">
                  @{user.username}
                </p>
              </div>
            </div>

            {/* Local Time */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Local Time
                </p>
                <p className="text-sm text-gray-900 font-medium">
                    {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              About
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Member of workspace
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Joined {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isCurrentUser && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleMessageClick}
                disabled={isCreatingConversation}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-500/40 hover:from-slate-700 hover:to-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isCreatingConversation ? "Loading..." : "Message"}
              </button>

              <button
                type="button"
                onClick={handleAddToChannelsClick}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300/50 active:scale-[0.98] transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Channel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add to Channels Modal */}
      {isAddToChannelsModalOpen && (
        <AddUserToChannelsModal
          user={user}
          workspaceId={workspaceId}
          onClose={() => setIsAddToChannelsModalOpen(false)}
        />
      )}
    </>
  );
}

export default UserProfilePage;
