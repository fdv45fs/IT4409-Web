import { useState, useEffect } from "react";
import { addChannelMember, getWorkspaceMembers } from "../api";
import useAuth from "../hooks/useAuth";

function AddChannelMemberModal({ workspaceId, channelId, onClose, onSuccess }) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { authFetch } = useAuth(); // Get authFetch

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  useEffect(() => {
    if (!query) {
      setFilteredMembers([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.user.fullName.toLowerCase().includes(lowerQuery) ||
        member.user.email.toLowerCase().includes(lowerQuery)
    );
    setFilteredMembers(filtered);
  }, [query, members]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      // Pass authFetch
      const data = await getWorkspaceMembers(workspaceId, authFetch);
      // data is WorkspaceMemberListResponseDto which contains { items: [...], meta: {...} } or just array?
      // Let's assume it returns array or object with items.
      // Based on controller it returns WorkspaceMemberListResponseDto.
      // Let's check DTO structure if possible, but generally:
      const items = data.items || data; 
      setMembers(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to fetch workspace members", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId, email) => {
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = userId ? { userId } : { email };
      // Pass authFetch
      await addChannelMember(channelId, payload, authFetch);
      setSuccessMsg(`Đã thêm thành viên thành công!`);
      setTimeout(() => {
        setSuccessMsg("");
        // Reset query to allow adding more
        setQuery("");
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      let errorMsg = err.message || "Không thể thêm thành viên";
      if (err.status === 400) {
        errorMsg = "Thành viên đã có trong channel hoặc không tồn tại.";
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

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Thêm thành viên
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close"
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

        {/* Content */}
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Tìm kiếm thành viên (theo tên hoặc email)
            </label>
            <div className="relative">
                <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập tên hoặc email..."
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

          {/* Messages */}
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {successMsg}
            </div>
          )}

          {/* Search Results */}
          <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-800/50">
            {isLoading ? (
                <div className="p-4 text-center text-slate-400">Đang tải danh sách thành viên...</div>
            ) : query && filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                    <p>Không tìm thấy thành viên nào khớp với "{query}".</p>
                    {query.includes('@') && (
                        <button
                            onClick={() => handleAddMember(null, query)}
                            disabled={isSubmitting}
                            className="mt-2 text-indigo-400 hover:underline disabled:opacity-50"
                        >
                            Thêm bằng email: {query}
                        </button>
                    )}
                </div>
            ) : (
                filteredMembers.map((member) => (
                <div
                    key={member.id}
                    className="flex items-center justify-between border-b border-slate-700/50 p-3 last:border-0 hover:bg-slate-700/50"
                >
                    <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-medium text-white">
                        {member.user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{member.user.fullName}</p>
                        <p className="text-xs text-slate-400">{member.user.email}</p>
                    </div>
                    </div>
                    <button
                    onClick={() => handleAddMember(member.userId, null)}
                    disabled={isSubmitting}
                    className="rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 transition hover:bg-indigo-500 hover:text-white disabled:opacity-50"
                    >
                    Thêm
                    </button>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddChannelMemberModal;
