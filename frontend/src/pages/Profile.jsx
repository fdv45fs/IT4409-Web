import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import {
  TetThemeWrapper,
  TetHeader,
  HorseIcon,
  LanternIcon,
  ApricotBlossomIcon,
  PeachBlossomIcon,
  SparkleDecor,
} from "../components/tet";
import {
  ArrowLeft,
  User,
  KeyRound,
  Upload,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
} from "lucide-react";

function Profile() {
  const { authFetch, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile data
  const [profile, setProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
  });

  // Avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch profile
  const fetchProfile = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await authFetch("/api/users/me");
      setProfile(data);
      setProfileForm({
        fullName: data.fullName || "",
        gender: data.gender || "",
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
      });
    } catch (err) {
      setError(err.message || "Không thể tải thông tin hồ sơ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsEditingProfile(true);

    try {
      const updatedProfile = await authFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      setProfile(updatedProfile);
      updateCurrentUser(updatedProfile);
      setSuccess("Cập nhật hồ sơ thành công!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Không thể cập nhật hồ sơ");
    } finally {
      setIsEditingProfile(false);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng chọn file ảnh");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    setIsUploadingAvatar(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", avatarFile);

      const updatedProfile = await authFetch("/api/users/me/avatar", {
        method: "PATCH",
        body: formData,
      });

      setProfile(updatedProfile);
      updateCurrentUser(updatedProfile);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSuccess("Cập nhật avatar thành công!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Không thể cập nhật avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu mới không khớp");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setIsChangingPassword(true);

    try {
      await authFetch("/api/users/me/change-password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("Đổi mật khẩu thành công!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Không thể đổi mật khẩu");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <TetThemeWrapper showFireworksToggle={false}>
        <TetHeader />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-amber-200 border-t-red-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <HorseIcon className="h-8 w-8 text-red-500 animate-heartbeat" />
              </div>
            </div>
            <p className="mt-6 text-gray-600">Đang tải hồ sơ...</p>
          </div>
        </div>
      </TetThemeWrapper>
    );
  }

  return (
    <TetThemeWrapper showFireworksToggle={false}>
      <TetHeader />

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate("/workspaces")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-gray-600 shadow-md transition hover:bg-white hover:text-red-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
            <p className="text-sm text-amber-600">Quản lý thông tin tài khoản</p>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700 animate-slide-in">
            <CheckCircle2 className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-700 animate-slide-in">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar - Avatar */}
          <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white/90 shadow-xl">
            {/* Avatar header gradient */}
            <div className="relative bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-8">
              <div className="absolute left-4 top-4 opacity-30">
                <ApricotBlossomIcon className="h-6 w-6 text-white animate-bloom" />
              </div>
              <div className="absolute right-4 top-4 opacity-30">
                <PeachBlossomIcon className="h-6 w-6 text-white animate-bloom" />
              </div>

              {/* Avatar */}
              <div className="relative mx-auto h-28 w-28">
                <div className="h-full w-full overflow-hidden rounded-full border-4 border-white/50 bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
                  {avatarPreview || profile?.avatarUrl ? (
                    <img
                      src={avatarPreview || profile.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                      {(profile?.fullName || profile?.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <SparkleDecor className="-right-1 top-0" />
                <SparkleDecor className="-left-1 bottom-2" delay="0.5s" />

                {/* Camera overlay */}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition hover:bg-amber-50"
                >
                  <Camera className="h-4 w-4 text-amber-600" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* User Info */}
            <div className="p-6 text-center">
              <h2 className="text-lg font-bold text-gray-900">{profile?.fullName}</h2>
              <p className="text-sm text-amber-600">@{profile?.username}</p>
              <p className="mt-1 text-xs text-gray-400">{profile?.email}</p>

              {/* Upload buttons */}
              {avatarFile && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleUploadAvatar}
                    disabled={isUploadingAvatar}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-red-500 to-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:shadow-lg disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>{isUploadingAvatar ? "Đang tải..." : "Lưu"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Tabs */}
          <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white/90 shadow-xl">
            {/* Top gradient */}
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500"></div>

            {/* Tabs */}
            <div className="border-b border-amber-100">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab("info")}
                  className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition ${activeTab === "info"
                      ? "border-red-500 text-red-600"
                      : "border-transparent text-gray-500 hover:border-amber-300 hover:text-amber-700"
                    }`}
                >
                  <User className="h-4 w-4" />
                  Thông tin cá nhân
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition ${activeTab === "password"
                      ? "border-red-500 text-red-600"
                      : "border-transparent text-gray-500 hover:border-amber-300 hover:text-amber-700"
                    }`}
                >
                  <KeyRound className="h-4 w-4" />
                  Đổi mật khẩu
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "info" && (
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, fullName: e.target.value })
                      }
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Giới tính
                    </label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, gender: e.target.value })
                      }
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, dateOfBirth: e.target.value })
                      }
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isEditingProfile}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:shadow-xl disabled:opacity-50"
                    >
                      {isEditingProfile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{isEditingProfile ? "Đang lưu..." : "Lưu thay đổi"}</span>
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "password" && (
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      required
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      required
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Nhập lại mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      required
                      className="w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-amber-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:shadow-xl disabled:opacity-50"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      <span>{isChangingPassword ? "Đang đổi..." : "Đổi mật khẩu"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </TetThemeWrapper>
  );
}

export default Profile;
