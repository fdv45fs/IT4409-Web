import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth.js";
import { useToast } from "../contexts/ToastContext";
import AddWorkspaceMemberModal from "./AddWorkspaceMemberModal";

function WorkspaceMembers({ workspaceId, isAdmin }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { authFetch, currentUser } = useAuth();
  const { addToast } = useToast();

  const fetchMembers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await authFetch(`/api/workspaces/${workspaceId}/members`);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách thành viên");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchMembers();
    }
  }, [workspaceId]);

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi workspace?")) {
      return;
    }

    try {
      await authFetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      addToast("Đã xóa thành viên", "success");
      fetchMembers();
    } catch (err) {
      addToast(err.message || "Lỗi khi xóa thành viên", "error");
    }
  };

  const handleUpdateRole = async (memberId, role) => {
    try {
      await authFetch(`/api/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      addToast("Đã cập nhật quyền thành viên", "success");
      fetchMembers();
    } catch (err) {
      addToast(err.message || "Lỗi khi cập nhật quyền", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Thành viên ({members.length})
        </h3>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Thêm thành viên
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          Chưa có thành viên nào
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-4 px-4 py-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.fullName || member.username}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (member.fullName || member.username || "U").charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {member.fullName}
                  {member.userId === currentUser?.id && <span className="ml-2 text-gray-500">(Bạn)</span>}
                </p>
                <p className="truncate text-xs text-gray-500">
                  @{member.username} • {member.email}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isAdmin && member.userId !== currentUser?.id ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="rounded-md border border-gray-300 py-1 pl-2 pr-8 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="WORKSPACE_MEMBER">Member</option>
                      <option value="WORKSPACE_PRIVILEGE_MEMBER">Privileged</option>
                      <option value="WORKSPACE_ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Xóa thành viên"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.role === "WORKSPACE_ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : member.role === "WORKSPACE_PRIVILEGE_MEMBER"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {member.role === "WORKSPACE_ADMIN" 
                      ? "Admin" 
                      : member.role === "WORKSPACE_PRIVILEGE_MEMBER"
                      ? "Privileged"
                      : "Member"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAddModalOpen && (
        <AddWorkspaceMemberModal
          workspaceId={workspaceId}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchMembers}
        />
      )}
    </div>
  );
}

export default WorkspaceMembers;
