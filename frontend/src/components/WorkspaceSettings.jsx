import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth.js";
import { useToast } from "../contexts/ToastContext";

function WorkspaceSettings({ workspace, workspaceId, isAdmin, onClose }) {
  const { authFetch } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", content: "" });
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (workspace) {
      setFormData({
        name: workspace.name,
        description: workspace.description || "",
        isPrivate: workspace.isPrivate,
      });
    }
  }, [workspace]);

  // Check if form has changes
  const hasChanges = workspace && (
    formData.name !== workspace.name ||
    formData.description !== (workspace.description || "") ||
    formData.isPrivate !== workspace.isPrivate
  );

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ type: "", content: "" });

    try {
      await authFetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      setSaveMessage({ type: "success", content: "Updated successfully!" });
    } catch (err) {
      setSaveMessage({
        type: "error",
        content: err.message || "Error updating workspace",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this Workspace? This action cannot be undone!"
      )
    ) {
      return;
    }

    try {
      await authFetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      addToast("Workspace deleted", "success");
      onClose();
      // Navigate will be handled by parent or route
    } catch (err) {
      addToast(err.message || "Error deleting workspace", "error");
    }
  };

  const handleReset = () => {
    if (workspace) {
      setFormData({
        name: workspace.name,
        description: workspace.description || "",
        isPrivate: workspace.isPrivate,
      });
      setSaveMessage({ type: "", content: "" });
    }
  };

  const handleCopyInviteCode = async () => {
    if (!workspace?.joinCode) {
      addToast("Invite code not found", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(workspace.joinCode);
      setCopySuccess(true);
      addToast("Invite code copied", "success");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      addToast("Unable to copy code", "error");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-3xl p-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your workspace information and configuration
              </p>
            </div>
          </div>
        </div>

        {/* Read-only Mode Alert */}
        {!isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-50/50 p-5 shadow-sm">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-2 bg-slate-100 rounded-full">
                  <svg className="h-5 w-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">View-only mode</h3>
                <p className="mt-1 text-sm text-slate-800 leading-relaxed">
                  You are a workspace member. To edit settings, please contact an administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Invite Code Section - Moved to top for easy access */}
        {workspace?.joinCode && (
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-cyan-50/30 border-2 border-slate-200 p-6 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                  <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">Workspace invite code</h3>
                  <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                    Share this code to invite new members to your workspace
                  </p>
                </div>
              </div>

              {/* Invite Code Display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={workspace.joinCode}
                    readOnly
                    onClick={(e) => e.target.select()}
                    className="block w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 pr-12 text-center text-lg font-mono font-bold text-slate-900 tracking-widest uppercase focus:outline-none focus:ring-4 focus:ring-slate-500/20 cursor-pointer select-all transition-all hover:border-slate-400"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopyInviteCode}
                className="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-500/40 hover:from-slate-700 hover:to-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/50 active:scale-[0.98] transition-all duration-200"
              >
                {copySuccess ? (
                  <>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy invite code
                  </>
                )}
              </button>

              {/* Info Message */}
              <div className="rounded-lg bg-slate-100/50 border border-slate-200 p-3.5">
                <div className="flex gap-3">
                  <svg className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-slate-900">Important note</p>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      This code is created once when the workspace is initialized. Only share it with people you trust to keep the workspace secure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Settings Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-gray-50 via-slate-50/30 to-gray-50 border-b border-gray-200 px-8 py-6">
            <h2 className="text-xl font-bold text-gray-900">
              Basic info
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Update the name, description, and privacy settings for the workspace
            </p>
          </div>

          {/* Card Body */}
          <div className="p-8">
            {/* Success/Error Message */}
            {saveMessage.content && (
              <div
                className={`mb-8 rounded-xl p-4 border-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  saveMessage.type === "success"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {saveMessage.type === "success" ? (
                    <div className="flex-shrink-0 p-1 bg-green-100 rounded-full">
                      <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 p-1 bg-red-100 rounded-full">
                      <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <span className={`text-sm font-semibold ${
                    saveMessage.type === "success" ? "text-green-800" : "text-red-800"
                  }`}>
                    {saveMessage.content}
                  </span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUpdateWorkspace} className="space-y-7">
              {/* Workspace Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Workspace name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={!isAdmin}
                  placeholder="E.g., Marketing Team, Project Alpha..."
                  className={`block w-full rounded-xl border-2 px-4 py-3.5 text-sm font-medium text-gray-900 transition-all ${
                    isAdmin
                      ? "border-gray-200 bg-white hover:border-slate-300 focus:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
                      : "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                  required
                />
              </div>

              {/* Workspace Description */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  disabled={!isAdmin}
                  placeholder="Briefly describe the workspace, its purpose, and members..."
                  className={`block w-full rounded-xl border-2 px-4 py-3.5 text-sm text-gray-900 transition-all resize-none ${
                    isAdmin
                      ? "border-gray-200 bg-white hover:border-slate-300 focus:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
                      : "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {formData.description.length} characters
                </p>
              </div>

              {/* Privacy Settings */}
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-slate-50/20 border-2 border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                      <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="isPrivate" className="block text-sm font-bold text-gray-900 cursor-pointer">
                        Private workspace
                      </label>
                      <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                        Require admin approval before new members can join the workspace
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => isAdmin && setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                    disabled={!isAdmin}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                      formData.isPrivate ? 'bg-slate-600' : 'bg-gray-300'
                    } ${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.isPrivate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              {isAdmin && (
                <div className="flex items-center justify-end gap-3 pt-6 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!hasChanges || isSaving}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={!hasChanges || isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <div className="rounded-xl border-2 border-red-300 bg-white shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-b-2 border-red-200 px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-700">
                  Danger zone
                </h3>
              </div>
            </div>
            <div className="p-8">
              <p className="mb-5 text-sm text-gray-700 leading-relaxed">
                Deleting a workspace will permanently remove <strong className="text-gray-900">all channels, messages, members, and related data</strong>.
                <span className="block mt-2 text-red-700 font-bold">⚠️ This action cannot be undone.</span>
              </p>
              <button
                onClick={handleDeleteWorkspace}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-red-600 bg-white px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/30 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceSettings;
