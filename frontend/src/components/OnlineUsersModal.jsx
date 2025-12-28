import React, { useEffect, useRef } from "react";

const OnlineUsersModal = ({
  isOpen,
  onClose,
  onlineUsers: onlineUsersProp,
}) => {
  const modalRef = useRef(null);
  const onlineUsers = Array.isArray(onlineUsersProp) ? onlineUsersProp : [];

  // Close modal when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-30 pointer-events-none" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="online-users-title"
          className="w-full max-w-md rounded-lg bg-white shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-lg border-b border-slate-800 bg-[rgb(30,41,59)] px-6 py-4">
            <div>
              <h2
                id="online-users-title"
                className="text-lg font-semibold text-white"
              >
                Online Users
              </h2>
              <p className="text-sm text-slate-300">
                {onlineUsers.length} online
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
          <div className="max-h-96 overflow-y-auto">
            {onlineUsers.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-sm font-medium text-white overflow-hidden">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName || user.username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user.fullName?.slice(0, 1) || user.username?.slice(0, 1)
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.fullName || user.username}
                      </p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>

                    {/* Status indicator */}
                    <div className="flex h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <svg
                  className="mb-2 h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z"
                  />
                </svg>
                <p className="text-sm">No one is online right now</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-white px-6 py-3">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-[rgb(30,41,59)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnlineUsersModal;
