import { useState, useEffect, useRef } from "react";
import useAuth from "../hooks/useAuth";

function UserProfileModal({ user, onClose, position = { x: 0, y: 0 } }) {
  const { currentUser } = useAuth();
  const modalRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [onClose]);

  // Adjust position to keep modal in viewport
  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        newX = viewportWidth - rect.width - 20;
      }
      if (rect.left < 0) {
        newX = 20;
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 20;
      }
      if (rect.top < 0) {
        newY = 20;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  if (!user) return null;

  const isCurrentUser = user.id === currentUser?.id;

  const handleMouseEnter = () => {
    // Cancel close timeout when mouse enters modal
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    // Auto-close after a short delay
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={modalRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 pointer-events-auto w-80"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
      >
        {/* Header with Avatar */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 relative p-6">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="h-24 w-24 rounded-xl object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="h-24 w-24 text-3xl rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white border-4 border-white shadow-lg uppercase">
              {user.fullName?.slice(0, 2) || user.username?.slice(0, 2) || "??"}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="p-6 space-y-4">
          {/* Name and Status */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">
                {user.fullName || user.username}
              </h2>
              {isCurrentUser && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Active now</span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            {/* Email */}
            {user.email && (
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Email
                  </p>
                  <p className="text-sm text-gray-900 break-all">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Username */}
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Username
                </p>
                <p className="text-sm text-gray-900">
                  @{user.username}
                </p>
              </div>
            </div>

            {/* Local Time */}
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Local Time
                </p>
                <p className="text-sm text-gray-900">
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
