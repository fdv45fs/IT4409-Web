import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Generate avatar from username
  const getAvatarContent = () => {
    if (currentUser?.avatarUrl) {
      return (
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.fullName}
          className="h-full w-full rounded-lg object-cover"
        />
      );
    }

    // Generate color based on username
    const username = currentUser?.username || "U";
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-teal-500",
    ];
    const colorIndex = username.charCodeAt(0) % colors.length;

    return (
      <div className={`flex h-full w-full items-center justify-center rounded-lg ${colors[colorIndex]} text-sm font-semibold text-white`}>
        {username.charAt(0).toUpperCase()}
      </div>
    );
  };

  const handleMenuClick = (action) => {
    setIsOpen(false);
    switch (action) {
      case "home":
        navigate("/workspaces");
        break;
      case "profile":
        navigate("/profile");
        break;
      case "logout":
        logout();
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        {getAvatarContent()}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          {/* User Info */}
          <div className="border-b border-slate-700 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              {currentUser?.fullName || currentUser?.username}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              @{currentUser?.username}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => handleMenuClick("home")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Trang chủ
            </button>

            <button
              onClick={() => handleMenuClick("profile")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Hồ sơ
            </button>

            <div className="my-1 border-t border-slate-700"></div>

            <button
              onClick={() => handleMenuClick("logout")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-slate-700 hover:text-red-300"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
