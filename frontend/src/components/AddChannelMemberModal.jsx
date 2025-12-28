import { useState, useEffect, useCallback } from "react";
import {
  addChannelMember,
  getWorkspaceMembers,
  getChannelMembers,
} from "../api";
import useAuth from "../hooks/useAuth";

function AddChannelMemberModal({ workspaceId, channelId, onClose, onSuccess }) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [channelMembers, setChannelMembers] = useState(new Set());
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { authFetch } = useAuth(); // Get authFetch

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use authFetch via helper functions
      const [workspaceData, channelData] = await Promise.all([
        getWorkspaceMembers(workspaceId, authFetch),
        getChannelMembers(channelId, authFetch),
      ]);

      // data is WorkspaceMemberListResponseDto { members: [...], totalCount, myRole }
      const items = workspaceData.members || workspaceData.items || [];
      setMembers(Array.isArray(items) ? items : []);

      // Store existing channel member IDs in a Set for fast lookup
      // channelData might be array of members directly
      const existingMemberIds = new Set(
        (Array.isArray(channelData) ? channelData : []).map((m) => m.userId)
      );
      setChannelMembers(existingMemberIds);
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, channelId, authFetch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Filter members based on search query and exclude existing channel members
  useEffect(() => {
    if (!query.trim()) {
      setFilteredMembers([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = members
      .filter((member) => !channelMembers.has(member.userId)) // Filter out existing members
      .filter(
        (member) =>
          member.fullName?.toLowerCase().includes(lowerQuery) ||
          member.username?.toLowerCase().includes(lowerQuery) ||
          member.email?.toLowerCase().includes(lowerQuery)
      );

    setFilteredMembers(filtered);
  }, [query, members, channelMembers]);

  const handleAddMember = async (userId, email) => {
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = userId ? { userId } : { email };
      // Pass authFetch
      await addChannelMember(channelId, payload, authFetch);
      setSuccessMsg("Member added successfully!");
      setTimeout(() => {
        setSuccessMsg("");
        // Reset query to allow adding more
        setQuery("");
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      let errorMsg = err.message || "Unable to add member";
      if (err.status === 400) {
        errorMsg = "Member already in the channel or does not exist.";
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-[rgb(30,41,59)] px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Add Member</h2>
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

        <div className="p-6">
          {/* Content */}
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[rgb(30,41,59)]">
                Search members (by name or email)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter name or email..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-10 text-[rgb(30,41,59)] placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <svg
                  className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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

            {/* Messages */}
            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMsg}
              </div>
            )}

            {/* Search Results */}
            <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading members...
                </div>
              ) : query && filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No members found matching "{query}".</p>
                  {query.includes("@") && (
                    <button
                      onClick={() => handleAddMember(null, query)}
                      disabled={isSubmitting}
                      className="mt-2 text-indigo-400 hover:underline disabled:opacity-50"
                    >
                      Add by email: {query}
                    </button>
                  )}
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between border-b border-gray-200 p-3 last:border-0 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(30,41,59)] text-xs font-medium text-white">
                        {(
                          member.fullName?.[0] ||
                          member.username?.[0] ||
                          "?"
                        ).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[rgb(30,41,59)]">
                          {member.fullName || member.username}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(member.userId, null)}
                      disabled={isSubmitting}
                      className="rounded-lg bg-[rgb(30,41,59)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddChannelMemberModal;
