import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getDirectConversations, getWorkspaceMembers } from "../api";
import useAuth from "../hooks/useAuth";
import { useDMSocket } from "../hooks/useDMSocket";

function DirectMessageList({ workspaceId, onStartNewConversation }) {
  const { conversationId } = useParams();
  const { accessToken, authFetch } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDMModal, setShowNewDMModal] = useState(false);

  // Initialize socket connection to listen for DM updates
  // Pass dummy conversationId since we're not joining a specific conversation
  useDMSocket(accessToken, null, workspaceId);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getDirectConversations(workspaceId, authFetch);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to fetch DM conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, authFetch]);

  useEffect(() => {
    if (workspaceId) {
      fetchConversations();
    }
  }, [workspaceId, fetchConversations]);

  // Update presence in conversation list when global presence events fire
  useEffect(() => {
    const handlePresenceUpdate = (event) => {
      const { userId, isOnline } = event.detail;
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.otherParticipant?.id === userId) {
            return {
              ...conv,
              otherParticipant: {
                ...conv.otherParticipant,
                isOnline,
              },
            };
          }
          return conv;
        })
      );
    };

    window.addEventListener("presence:user:update", handlePresenceUpdate);
    return () =>
      window.removeEventListener("presence:user:update", handlePresenceUpdate);
  }, []);

  // Listen for conversation updates (new message from someone not in list yet)
  useEffect(() => {
    const handleConversationUpdated = (event) => {
      console.log(
        "DirectMessageList: Received conversation update:",
        event.detail
      );
      // When a new conversation is created or updated, refresh the list
      if (event.detail.workspaceId === workspaceId) {
        console.log(
          "DirectMessageList: Refreshing conversations for workspace:",
          workspaceId
        );
        // Call fetch directly instead of using callback to avoid dependency issues
        getDirectConversations(workspaceId, authFetch)
          .then((data) => {
            setConversations(data.conversations || []);
          })
          .catch((err) => {
            console.error("Failed to refresh DM conversations:", err);
          });
      }
    };

    window.addEventListener(
      "dm:conversation:updated",
      handleConversationUpdated
    );
    return () => {
      window.removeEventListener(
        "dm:conversation:updated",
        handleConversationUpdated
      );
    };
  }, [workspaceId, authFetch]);

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes`;
    if (diffHours < 24) return `${diffHours} hours`;
    if (diffDays < 7) return `${diffDays} days`;
    return date.toLocaleDateString("en-US");
  };

  if (isLoading) {
    return (
      <div className="space-y-2 px-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-2 px-2 py-2"
          >
            <div className="h-8 w-8 rounded-full bg-slate-700" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-slate-700 rounded mb-1" />
              <div className="h-2 w-32 bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Header with New DM button */}
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="flex items-center text-sm font-medium text-slate-400">
          <svg
            className="mr-1 h-3 w-3"
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
          Messages
        </span>
        <button
          onClick={() => setShowNewDMModal(true)}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="New messages"
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

      {/* Conversations list */}
      {conversations.length === 0 ? (
        <div className="px-4 py-4 text-center text-sm text-slate-500">
          <p>No messages yet</p>
          <button
            onClick={() => setShowNewDMModal(true)}
            className="mt-2 text-indigo-400 hover:text-indigo-300"
          >
            Start a new conversation
          </button>
        </div>
      ) : (
        conversations.map((conv) => {
          const isActive = conversationId === conv.id;
          const user = conv.otherParticipant;

          return (
            <Link
              key={conv.id}
              to={`/workspace/${workspaceId}/dm/${conv.id}`}
              className={`group flex items-center gap-2 rounded px-2 py-2 transition ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || user.username}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-medium text-white">
                    {user.fullName?.[0] || user.username?.[0] || "?"}
                  </div>
                )}
                <div
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                    user.isOnline ? "bg-green-500" : "bg-slate-500"
                  }`}
                />
              </div>

              {/* User info and last message */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">
                    {user.fullName || user.username}
                  </span>
                  {conv.lastMessage && (
                    <span
                      className={`text-xs ${
                        isActive ? "text-blue-200" : "text-slate-500"
                      }`}
                    >
                      {formatTimeAgo(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p
                    className={`truncate text-xs ${
                      isActive ? "text-blue-200" : "text-slate-500"
                    }`}
                  >
                    {conv.lastMessage.isDeleted
                      ? "Message has been deleted"
                      : conv.lastMessage.content || "📎 Attachment"}
                  </p>
                )}
              </div>

              {/* Unread badge */}
              {conv.unreadCount > 0 && !isActive && (
                <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-xs font-medium text-white">
                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                </div>
              )}
            </Link>
          );
        })
      )}

      {/* New DM Modal */}
      {showNewDMModal && (
        <NewDMModal
          workspaceId={workspaceId}
          onClose={() => setShowNewDMModal(false)}
          onSuccess={(conversation) => {
            setShowNewDMModal(false);
            fetchConversations();
            if (onStartNewConversation) {
              onStartNewConversation(conversation);
            }
          }}
        />
      )}
    </div>
  );
}

// Modal to start new DM conversation
function NewDMModal({ workspaceId, onClose, onSuccess }) {
  const { authFetch, currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await getWorkspaceMembers(workspaceId, authFetch);
        // Filter out current user
        const filtered = (data.members || []).filter(
          (m) => m.userId !== currentUser?.id
        );
        setMembers(filtered);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMembers();
  }, [workspaceId, authFetch, currentUser?.id]);

  const filteredMembers = members.filter((m) => {
    const lowerSearch = search.toLowerCase();
    return (
      m.fullName?.toLowerCase().includes(lowerSearch) ||
      m.username?.toLowerCase().includes(lowerSearch) ||
      m.email?.toLowerCase().includes(lowerSearch)
    );
  });

  const handleSelectUser = async (userId) => {
    setIsCreating(true);
    try {
      const { getOrCreateDirectConversation } = await import("../api");
      const conversation = await getOrCreateDirectConversation(
        workspaceId,
        userId,
        authFetch
      );
      onSuccess(conversation);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">New messages</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
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

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pl-10 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Members list */}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-800/50">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">Loading...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              {search ? "No members found" : "No other members"}
            </div>
          ) : (
            filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectUser(member.userId)}
                disabled={isCreating}
                className="flex w-full items-center gap-3 border-b border-slate-700/50 p-3 text-left transition last:border-0 hover:bg-slate-700/50 disabled:opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
                  {member.fullName?.[0] || member.username?.[0] || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {member.fullName || member.username}
                  </p>
                  <p className="truncate text-sm text-slate-400">
                    {member.email}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DirectMessageList;
