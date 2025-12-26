import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { Home, User, LogOut, ChevronDown } from "lucide-react";
import {
  LanternIcon,
  HorseIcon,
  RedEnvelopeIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
} from "./tet/TetIcons";

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
          className="h-full w-full rounded-xl object-cover"
        />
      );
    }

    // Tet-themed avatar colors
    const username = currentUser?.username || "U";
    const colors = [
      "from-red-500 to-amber-500",
      "from-amber-500 to-yellow-500",
      "from-red-600 to-red-500",
      "from-pink-500 to-red-500",
      "from-amber-600 to-amber-500",
      "from-red-500 to-pink-500",
      "from-yellow-500 to-amber-500",
      "from-orange-500 to-red-500",
    ];
    const colorIndex = username.charCodeAt(0) % colors.length;

    return (
      <div className={`flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br ${colors[colorIndex]} text-sm font-bold text-white shadow-lg`}>
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
        className="group flex items-center gap-2 rounded-xl bg-white/50 p-1 pr-2 transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        <div className="relative h-9 w-9 overflow-hidden rounded-lg">
          {getAvatarContent()}
        </div>
        <ChevronDown className={`h-4 w-4 text-amber-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-2xl shadow-amber-200/50 animate-slide-in z-50">
          {/* Gradient top border */}
          <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>

          {/* User Info Section */}
          <div className="relative border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-4">
            {/* Decorative icons */}
            <div className="absolute right-2 top-2 opacity-20">
              <ApricotBlossomIcon className="h-6 w-6 text-amber-500" />
            </div>
            <div className="absolute right-8 bottom-2 opacity-15">
              <PeachBlossomIcon className="h-5 w-5 text-pink-400" />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                {getAvatarContent()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-bold text-gray-900">
                  {currentUser?.fullName || currentUser?.username}
                </p>
                <p className="truncate text-sm text-amber-600">
                  @{currentUser?.username}
                </p>
              </div>
            </div>

            {/* New Year greeting */}
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs">
              <LanternIcon className="h-4 w-4 text-red-500 animate-swing" />
              <span className="text-amber-700 font-medium">Chúc năm mới an khang!</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => handleMenuClick("home")}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-amber-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition group-hover:bg-gradient-to-br group-hover:from-red-500 group-hover:to-amber-500 group-hover:text-white">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-medium group-hover:text-red-600">Trang chủ</span>
            </button>

            <button
              onClick={() => handleMenuClick("profile")}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-amber-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition group-hover:bg-gradient-to-br group-hover:from-red-500 group-hover:to-amber-500 group-hover:text-white">
                <User className="h-4 w-4" />
              </div>
              <span className="font-medium group-hover:text-red-600">Hồ sơ cá nhân</span>
            </button>

            <div className="my-2 border-t border-amber-100"></div>

            <button
              onClick={() => handleMenuClick("logout")}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-red-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-500 transition group-hover:bg-red-500 group-hover:text-white">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="font-medium group-hover:text-red-600">Đăng xuất</span>
            </button>
          </div>

          {/* Footer decoration */}
          <div className="flex items-center justify-center gap-3 border-t border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 py-3">
            {[RedEnvelopeIcon, LanternIcon, HorseIcon, ApricotBlossomIcon, PeachBlossomIcon].map((Icon, i) => (
              <Icon
                key={i}
                className={`h-4 w-4 ${i % 2 === 0 ? 'text-red-500' : 'text-amber-500'} animate-bounce`}
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '2s' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
