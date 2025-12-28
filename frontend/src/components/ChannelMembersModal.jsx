import { useState, useEffect, useCallback } from "react";
import {
  removeChannelMember,
  getChannelMembers,
  updateChannelMemberRole,
} from "../api";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";

function ChannelMembersModal({ channelId, onlineUsers = [], onClose, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { authFetch, currentUser } = useAuth();
  const { addToast } = useToast();

  // We need to know current user's role in the channel to show/hide admin controls
  // This info comes usually from getChannelMembers (if it includes role) or context.
  // Assuming getChannelMembers returns objects like { id, userId, role, user: {...} }
  const [myRole, setMyRole] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const membersData = await getChannelMembers(channelId, authFetch);
      setMembers(membersData);

      // Find my role
      const me = membersData.find((m) => m.userId === currentUser?.id);
      if (me) setMyRole(me.roleName || me.role); // Handle roleName if role object not fully populated
    } catch (err) {
      setError("Unable to load members");
    } finally {
      setIsLoading(false);
    }
  }, [channelId, authFetch, currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveMember = async (memberId) => {
    if (
      !window.confirm("Are you sure you want to remove this member from the channel?")
    ) {
      return;
    }
    try {
      await removeChannelMember(channelId, memberId, authFetch);
      setMembers(members.filter((m) => m.id !== memberId));
      if (onUpdate) onUpdate();
      addToast("Member removed", "success");
    } catch (err) {
      addToast(err.message || "Unable to remove member", "error");
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await updateChannelMemberRole(channelId, memberId, newRole, authFetch);
      // Update local state
      setMembers(
        members.map((m) =>
          m.id === memberId ? { ...m, role: newRole, roleName: newRole } : m
        )
      );
      if (onUpdate) onUpdate();
      addToast("Member role updated", "success");
    } catch (err) {
      addToast(err.message || "Unable to update role", "error");
    }
  };

  const canManage = myRole === "CHANNEL_ADMIN" || myRole === "WORKSPACE_ADMIN"; // Or check workspace role context if needed

  const onlineUserIdSet = new Set(
    (Array.isArray(onlineUsers) ? onlineUsers : [])
      .map((u) => u?.id)
      .filter(Boolean)
  );

  const onlineMembers = members.filter((m) => onlineUserIdSet.has(m.userId));
  const offlineMembers = members.filter((m) => !onlineUserIdSet.has(m.userId));

  const renderMemberItem = (member) => (
    <li
      key={member.id}
      className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-gray-100 transition"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[rgb(30,41,59)] flex items-center justify-center text-white font-bold overflow-hidden">
            {member.user?.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt={member.user?.fullName || member.user?.username}
                className="h-full w-full object-cover"
              />
            ) : (
              (
                member.user?.fullName?.[0] ||
                member.user?.username?.[0] ||
                "?"
              ).toUpperCase()
            )}
          </div>
          {onlineUserIdSet.has(member.userId) && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
              aria-label="Online"
              title="Online"
            />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-[rgb(30,41,59)]">
            {member.user?.fullName || member.user?.username}
            {(member.roleName === "CHANNEL_ADMIN" ||
              member.role === "CHANNEL_ADMIN") && (
              <span className="ml-2 text-xs text-amber-600 border border-amber-400 bg-amber-50 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">@{member.user?.username}</p>
        </div>
      </div>

      {/* Actions */}
      {currentUser?.id !== member.userId && canManage && (
        <div className="flex items-center gap-2">
          <select
            value={member.roleName || member.role}
            onChange={(e) => handleChangeRole(member.id, e.target.value)}
            className="bg-white text-[rgb(30,41,59)] text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="CHANNEL_MEMBER">Member</option>
            <option value="CHANNEL_ADMIN">Admin</option>
          </select>

          <button
            onClick={() => handleRemoveMember(member.id)}
            className="text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1"
            title="Remove member"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-white shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between bg-[rgb(30,41,59)] px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Channel Members</h2>
            <p className="text-xs text-white/70 mt-0.5">
              {onlineMembers.length}/{members.length} online
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
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

        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          ) : members.length === 0 ? (
            <div className="text-gray-500 text-center p-4">
              No members yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Online ({onlineMembers.length})
                  </h3>
                </div>
                {onlineMembers.length === 0 ? (
                  <div className="text-sm text-gray-500 rounded-lg bg-gray-50 p-3">
                    No one is online.
                  </div>
                ) : (
                  <ul className="space-y-2">{onlineMembers.map(renderMemberItem)}</ul>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Other members ({offlineMembers.length})
                  </h3>
                </div>
                {offlineMembers.length === 0 ? (
                  <div className="text-sm text-gray-500 rounded-lg bg-gray-50 p-3">
                    No other members.
                  </div>
                ) : (
                  <ul className="space-y-2">{offlineMembers.map(renderMemberItem)}</ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChannelMembersModal;
