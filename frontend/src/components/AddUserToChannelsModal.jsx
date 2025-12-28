import { useState, useEffect, useMemo } from "react";
import { X, Search } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getChannels, addChannelMember } from "../api";
import { useToast } from "../contexts/ToastContext";

function AddUserToChannelsModal({ user, workspaceId, onClose }) {
  const { authFetch } = useAuth();
  const { addToast } = useToast();
  const [channels, setChannels] = useState([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true);
        const data = await getChannels(workspaceId, authFetch);
        // Filter channels where user can add members (admin channels)
        const adminChannels = data.filter(
          (ch) => ch.myRole === "CHANNEL_ADMIN" || ch.myRole === "WORKSPACE_ADMIN"
        );
        setChannels(adminChannels);
      } catch (err) {
        addToast(err.message || "Unable to load channels", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId) {
      fetchChannels();
    }
  }, [workspaceId, authFetch, addToast]);

  // Filter channels based on search query
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(query) ||
        ch.description?.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const toggleChannel = (channelId) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedChannelIds.length === 0) {
      addToast("Please select at least one channel", "error");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const channelId of selectedChannelIds) {
      try {
        await addChannelMember(
          channelId,
          { userId: user.id },
          authFetch
        );
        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Failed to add user to channel ${channelId}:`, err);
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      addToast(
        `${user.fullName || user.username} added to ${successCount} channel${successCount > 1 ? "s" : ""}`,
        "success"
      );
    }

    if (errorCount > 0) {
      addToast(
        `Could not add to ${errorCount} channel${errorCount > 1 ? "s" : ""} (user may already be a member)`,
        "error"
      );
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Add {user.fullName || user.username} to channels
            </h2>
            {selectedChannelIds.length > 0 && (
              <p className="mt-1 text-sm text-indigo-600 font-medium">
                ✓ Selected {selectedChannelIds.length} channel{selectedChannelIds.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                  <p className="mt-3 text-sm text-gray-500">Loading channels...</p>
                </div>
              </div>
            ) : channels.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">No channels available</p>
                <p className="text-sm text-gray-500 mt-1">
                  You do not manage any channels to add members
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search channels..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Info Text */}
                <div className="flex items-center justify-between text-sm">
                  <p className="text-gray-600">
                    Select the channels you want to add this user to
                  </p>
                  <p className="text-gray-500">
                    {filteredChannels.length} channel{filteredChannels.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Channel List */}
                {filteredChannels.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No channels match "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredChannels.map((channel) => {
                      const isSelected = selectedChannelIds.includes(channel.id);
                      return (
                        <label
                          key={channel.id}
                          className={`group flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50 shadow-sm"
                              : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center h-6">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleChannel(channel.id)}
                              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer transition-all"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg ${isSelected ? "opacity-100" : "opacity-60"}`}>
                                {channel.isPrivate ? "🔒" : "#"}
                              </span>
                              <span className={`font-semibold ${isSelected ? "text-indigo-900" : "text-gray-900"}`}>
                                {channel.name}
                              </span>
                              {isSelected && (
                                <span className="ml-auto flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
                                  ✓ Selected
                                </span>
                              )}
                            </div>
                            {channel.description && (
                              <p className={`mt-1.5 text-sm ${isSelected ? "text-indigo-700" : "text-gray-600"}`}>
                                {channel.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Sticky */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <p className="text-sm text-gray-600">
              {selectedChannelIds.length > 0 ? (
                <span className="font-medium text-indigo-600">
                  {selectedChannelIds.length} channel selected
                </span>
              ) : (
                "No channel selected"
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedChannelIds.length === 0}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Adding...
                  </span>
                ) : (
                  `Add to ${selectedChannelIds.length} channel${selectedChannelIds.length > 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUserToChannelsModal;
