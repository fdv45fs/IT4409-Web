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

  const fetchMembers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError("");
    try {
      const data = await authFetch(`/api/workspaces/${workspaceId}/members`);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || "Unable to load members");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchMembers();
    }
  }, [workspaceId]);

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member from the workspace?")) {
      return;
    }

    // Optimistic UI update
    const originalMembers = [...members];
    setMembers(members.filter(member => member.id !== memberId));

    try {
      await authFetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      addToast("Member removed", "success");
    } catch (err) {
      // Rollback on error
      setMembers(originalMembers);
      addToast(err.message || "Error removing member", "error");
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    // Optimistic UI update
    const originalMembers = [...members];
    setMembers(members.map(member =>
      member.id === memberId
        ? { ...member, role: newRole }
        : member
    ));

    try {
      await authFetch(`/api/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      addToast("Member role updated", "success");
    } catch (err) {
      // Rollback on error
      setMembers(originalMembers);
      addToast(err.message || "Error updating role", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 scroll-smooth">
      <div className="mx-auto max-w-4xl p-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workspace Members</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and control member access
              </p>
            </div>
          </div>
        </div>

        {/* Members Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 via-slate-50/30 to-gray-50 px-8 py-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Member List
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold text-slate-600">{members.length}</span> {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-500/40 hover:from-slate-700 hover:to-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/50 active:scale-95 transition-all duration-200"
              >
                <svg className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </button>
            )}
          </div>

          {/* Card Body */}
          {members.length === 0 ? (
            <div className="px-8 py-16 text-center animate-in fade-in duration-500">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">No members yet</p>
              <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                Start building your team by inviting members to the workspace
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {members.map((member, index) => (
                <li
                  key={member.id}
                  className="group flex items-center gap-5 px-8 py-5 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent transition-all duration-200 animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600 text-lg font-bold text-white shadow-lg ring-4 ring-white group-hover:shadow-xl group-hover:scale-105 transition-all duration-200">
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
                    {member.role === "WORKSPACE_ADMIN" && (
                      <div className="absolute -bottom-1 -right-1 p-1 bg-purple-500 rounded-full ring-2 ring-white" title="Admin">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold text-gray-900">
                        {member.fullName}
                      </p>
                      {member.userId === currentUser?.id && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200 animate-in fade-in zoom-in duration-300">
                          You
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-gray-600 mt-1">
                      <span className="font-semibold">@{member.username}</span>
                    </p>
                    <p className="truncate text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {member.email}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isAdmin && member.userId !== currentUser?.id ? (
                      <>
                        <div className="relative">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="appearance-none rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-900 hover:border-slate-300 hover:shadow-md focus:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all duration-200 cursor-pointer"
                          >
                            <option value="WORKSPACE_MEMBER">Member</option>
                            <option value="WORKSPACE_PRIVILEGE_MEMBER">Privileged</option>
                            <option value="WORKSPACE_ADMIN">Admin</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="group/delete rounded-xl p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-red-500/20 active:scale-95 transition-all duration-200"
                          title="Remove member"
                        >
                          <svg className="h-5 w-5 transition-transform duration-200 group-hover/delete:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-sm ring-1 transition-all duration-200 ${
                          member.role === "WORKSPACE_ADMIN"
                            ? "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 ring-purple-200 hover:shadow-md hover:from-purple-200 hover:to-purple-100"
                            : member.role === "WORKSPACE_PRIVILEGE_MEMBER"
                            ? "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 ring-slate-200 hover:shadow-md hover:from-slate-200 hover:to-slate-100"
                            : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 ring-gray-200 hover:shadow-md hover:from-gray-200 hover:to-gray-100"
                        }`}
                        title={member.role === "WORKSPACE_ADMIN" ? "Has full workspace management permissions" : member.role === "WORKSPACE_PRIVILEGE_MEMBER" ? "Can manage channels and messages" : "Standard member"}
                      >
                        {member.role === "WORKSPACE_ADMIN" && (
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                        )}
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
        </div>
      </div>

      {isAddModalOpen && (
        <AddWorkspaceMemberModal
          workspaceId={workspaceId}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => fetchMembers(true)}
        />
      )}
    </div>
  );
}

export default WorkspaceMembers;
