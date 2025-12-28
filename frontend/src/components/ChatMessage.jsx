import { useState, useRef, useEffect } from "react";
import { API_URL } from "../api";
import useAuth from "../hooks/useAuth";
import UserProfileModal from "./UserProfileModal";
import { useUserProfile } from "../contexts/UserProfileContext";
import FilePreviewModal from "./FilePreviewModal";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

function ChatMessage({
  message,
  currentUserId,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onReply,
  onJumpToMessage,
  isHighlighted = false,
  members = [],
}) {
  const { authFetchRaw } = useAuth();
  const { openProfile } = useUserProfile();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [profilePosition, setProfilePosition] = useState({ x: 0, y: 0 });
  const [previewFile, setPreviewFile] = useState(null);
  const emojiPickerRef = useRef(null);
  const profileTimeoutRef = useRef(null);

  const isOwner = message.sender?.id === currentUserId;
  const isDeleted = message.isDeleted;

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReaction = (emoji) => {
    const existingReaction = message.reactions?.find(
      (r) => r.emoji === emoji && r.userIds?.includes(currentUserId)
    );

    if (existingReaction) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleShowProfile = (event) => {
    // Clear any existing timeout
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setProfilePosition({
      x: rect.left + rect.width + 10,
      y: rect.top,
    });

    // Delay showing profile slightly to avoid accidental triggers
    profileTimeoutRef.current = setTimeout(() => {
      setShowUserProfile(true);
    }, 300);
  };

  const handleHideProfile = () => {
    // Clear timeout if user moves away before profile shows
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
    }
    setShowUserProfile(false);
  };

  const handleClick = () => {
    // Clear any existing timeout
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
    }

    // Hide hover profile if showing
    setShowUserProfile(false);

    // Open full profile page via context
    if (message.sender) {
      openProfile(message.sender);
    }
  };

  const handleRightClick = (event) => {
    event.preventDefault(); // Prevent default browser context menu

    // Clear any existing timeout
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
    }

    // Hide hover profile if showing
    setShowUserProfile(false);

    // Open full profile page via context
    if (message.sender) {
      openProfile(message.sender);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Parse mentions in content
  const renderContent = (content) => {
    if (!content) return null;

    // Simple mention parsing - replace @username with highlighted span
    let result = content;
    message.mentions?.forEach((mention) => {
      const regex = new RegExp(`@${mention.username}`, "g");
      result = result.replace(
        regex,
        `<span class="bg-indigo-100 text-indigo-700 px-1 rounded">@${
          mention.fullName || mention.username
        }</span>`
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <div
      className={`group relative flex gap-3 px-4 py-3 hover:bg-gray-100 border-b border-gray-100 ${
        isDeleted ? "opacity-60" : ""
      } ${isHighlighted ? "bg-amber-50" : ""} ${
        ""
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Avatar */}
      <div
        onMouseEnter={handleShowProfile}
        onMouseLeave={handleHideProfile}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {message.sender?.avatarUrl ? (
          <img
            src={message.sender.avatarUrl}
            alt={message.sender.fullName}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-semibold text-white uppercase">
            {message.sender?.fullName?.slice(0, 2) ||
              message.sender?.username?.slice(0, 2) ||
              "??"}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className="min-w-0 flex-1 max-w-[75%]"
      >
        {/* Header */}
        <div className="flex items-baseline gap-2">
          <span
            onMouseEnter={handleShowProfile}
            onMouseLeave={handleHideProfile}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            className="font-semibold text-gray-900 text-sm hover:underline cursor-pointer"
          >
            {message.sender?.fullName || message.sender?.username || "Unknown"}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Reply reference */}
        {message.replyTo && (
          <button
            type="button"
            onClick={() => onJumpToMessage?.(message.replyTo.id)}
            className="mt-1 flex w-full items-center gap-2 text-left text-xs text-gray-500 border-l-2 border-gray-300 pl-2 hover:text-gray-700"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span className="font-medium">
              {message.replyTo.sender?.fullName ||
                message.replyTo.sender?.username}
            </span>
            <span className="truncate max-w-xs">
              {message.replyTo.isDeleted
                ? "Message has been deleted"
                : message.replyTo.content}
            </span>
          </button>
        )}

        {/* Message content */}
        {isDeleted ? (
          <p className="mt-1 text-base text-gray-400 italic leading-relaxed">
            Message has been deleted
          </p>
        ) : (
          <p className="mt-1 text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
            {renderContent(message.content)}
          </p>
        )}

        {/* Attachments - Horizontal scroll list */}
        {message.attachments?.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {message.attachments.map((attachment) => {
                const rawUrl = attachment.fileUrl;
                const urlWithoutQuery = (rawUrl || "").split("?")[0];
                const fileName =
                  decodeURIComponent(urlWithoutQuery.split("/").pop() || "") ||
                  "file";
                const isImage = urlWithoutQuery.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                const isVideo = urlWithoutQuery.match(/\.(mp4|webm|ogg)$/i);
                const isPdf = urlWithoutQuery.match(/\.pdf$/i);

                if (isImage) {
                  // Determine specific image mime type
                  const ext = urlWithoutQuery.match(/\.(jpeg|jpg|gif|png|webp)$/i)?.[1].toLowerCase();
                  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' 
                    : ext === 'png' ? 'image/png'
                    : ext === 'gif' ? 'image/gif'
                    : ext === 'webp' ? 'image/webp'
                    : 'image/jpeg';
                  
                  return (
                    <div key={attachment.id} className="flex-shrink-0">
                      <img
                        src={attachment.fileUrl}
                        alt={fileName}
                        className="h-48 w-auto max-w-xs rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition"
                        onClick={() => setPreviewFile({ fileUrl: attachment.fileUrl, fileName: fileName, mimeType })}
                      />
                    </div>
                  );
                } else if (isVideo) {
                  // Determine specific video mime type
                  const ext = urlWithoutQuery.match(/\.(mp4|webm|ogg)$/i)?.[1].toLowerCase();
                  const mimeType = ext === 'mp4' ? 'video/mp4'
                    : ext === 'webm' ? 'video/webm'
                    : ext === 'ogg' ? 'video/ogg'
                    : 'video/mp4';
                  
                  return (
                    <div key={attachment.id} className="flex-shrink-0 relative group">
                      <video
                        src={attachment.fileUrl}
                        className="h-48 w-auto max-w-xs rounded-lg border border-gray-200 cursor-pointer"
                        onClick={() => setPreviewFile({ fileUrl: attachment.fileUrl, fileName: fileName, mimeType })}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  );
                } else {
                  const downloadPath = `/api/upload/attachments/${attachment.id}/download`;
                  const downloadUrl = `${API_URL}${downloadPath}`;

                  const handleOpenOrDownload = async (e) => {
                    e.preventDefault();
                    try {
                      const response = await authFetchRaw(downloadPath);
                      const blob = await response.blob();
                      const objectUrl = URL.createObjectURL(blob);

                      if (isPdf) {
                        window.open(objectUrl, "_blank", "noopener,noreferrer");
                        // Delay revoke a bit to avoid cutting off loading in some browsers
                        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
                        return;
                      }

                      const a = document.createElement("a");
                      a.href = objectUrl;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(objectUrl);
                    } catch (err) {
                      console.error("Failed to download attachment:", err);
                    }
                  };
                  return (
                    <a
                      key={attachment.id}
                      href={downloadUrl}
                      {...(isPdf
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : { download: fileName })}
                      onClick={handleOpenOrDownload}
                      className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition w-64"
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{fileName}</p>
                        <p className="text-xs text-gray-500">
                          {isPdf ? "Click to open" : "Click to download"}
                        </p>
                      </div>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                  );
                }
              })}
            </div>
          </div>
        )}

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => {
              const hasReacted = reaction.userIds?.includes(currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                    hasReacted
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200"
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !isDeleted && (
        <div
          className={`absolute top-1 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-0.5 shadow-sm ${
            "right-4"
          }`}
        >
          {/* Emoji reaction */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Add reaction"
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
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* Emoji picker dropdown */}
            {showEmojiPicker && (
              <div className="absolute right-0 top-full mt-1 z-10 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="rounded p-1 text-lg hover:bg-gray-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            onClick={() => onReply(message)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Reply"
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
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </button>

          {/* Delete (only for owner) */}
          {isOwner && (
            <button
              onClick={() => onDelete(message.id)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="Delete message"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* User Profile Modal (hover) */}
      {showUserProfile && message.sender && (
        <UserProfileModal
          user={message.sender}
          onClose={() => setShowUserProfile(false)}
          position={profilePosition}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

export default ChatMessage;
