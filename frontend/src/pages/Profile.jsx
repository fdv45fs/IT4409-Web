import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

function Profile() {
  const { authFetch, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backTarget = location.state?.from || "/workspaces";
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
      setError(err.message || "Failed to load profile information");
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
      updateCurrentUser(updatedProfile); // Update context
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsEditingProfile(false);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must not exceed 5MB");
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
      setSuccess("Avatar updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update avatar");
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
      setError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
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
      setSuccess("Password changed successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50">
      {/* Header */}
      <header className="border-b border-amber-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(backTarget)}
              className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-100 hover:text-amber-800"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-amber-800">Profile</h1>
              <p className="text-sm text-amber-600">Manage account information</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar - Avatar */}
          <div className="rounded-lg border border-amber-100 bg-white/90 p-6 shadow-sm">
            <div className="text-center">
              {/* Avatar Display */}
              <div className="mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500">
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

              <h2 className="text-lg font-semibold text-amber-900">
                {profile?.fullName}
              </h2>
              <p className="text-sm text-amber-700">@{profile?.username}</p>
              <p className="mt-1 text-xs text-amber-600">{profile?.email}</p>

              {/* Upload Avatar */}
              <div className="mt-4">
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Select Image
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                {avatarFile && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleUploadAvatar}
                      disabled={isUploadingAvatar}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isUploadingAvatar ? "Uploading..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Tabs */}
          <div className="rounded-lg border border-amber-100 bg-white/95 shadow-sm">
            {/* Tabs */}
            <div className="border-b border-amber-100">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab("info")}
                  className={`border-b-2 px-6 py-4 text-sm font-medium transition ${
                    activeTab === "info"
                      ? "border-amber-500 text-amber-800"
                      : "border-transparent text-amber-600 hover:border-amber-200 hover:text-amber-700"
                  }`}
                >
                  Personal Information
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`border-b-2 px-6 py-4 text-sm font-medium transition ${
                    activeTab === "password"
                      ? "border-amber-500 text-amber-800"
                      : "border-transparent text-amber-600 hover:border-amber-200 hover:text-amber-700"
                  }`}
                >
                  Change Password
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "info" && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          fullName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          gender: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          dateOfBirth: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isEditingProfile}
                      className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isEditingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "password" && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                      className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
