import { useState, useRef, useEffect } from "react";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const emojiPickerRef = useRef(null);

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

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("vi-VN", {
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
      className={`group relative flex gap-3 px-4 py-2 hover:bg-gray-50 ${
        isDeleted ? "opacity-60" : ""
      } ${isHighlighted ? "bg-amber-50" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
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
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-gray-900 text-sm">
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
                ? "Tin nhắn đã bị xóa"
                : message.replyTo.content}
            </span>
          </button>
        )}

        {/* Message content */}
        {isDeleted ? (
          <p className="mt-1 text-sm text-gray-400 italic">
            Tin nhắn đã bị xóa
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>
        )}

        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                File đính kèm
              </a>
            ))}
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
        <div className="absolute right-4 top-1 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-0.5 shadow-sm">
          {/* Emoji reaction */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Thêm reaction"
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
            title="Trả lời"
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
              title="Xóa tin nhắn"
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
    </div>
  );
}

export default ChatMessage;
