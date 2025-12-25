import { useEffect, useRef, useState, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import { useChatSocket } from "../hooks/useChatSocket";
import { useToast } from "../contexts/ToastContext";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

function ChannelChat({ channelId, channelName, members = [] }) {
  const { accessToken, currentUser, authFetch } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Debug: Log token status
  useEffect(() => {
    console.log("ChannelChat: accessToken available:", !!accessToken);
    console.log("ChannelChat: currentUser:", currentUser?.username);
    console.log("ChannelChat: channelId:", channelId);
  }, [accessToken, currentUser, channelId]);

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const {
    isConnected,
    isJoined,
    messages,
    typingUsers,
    onlineUsers,
    error,
    sendMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    markAsRead,
    setInitialMessages,
  } = useChatSocket(accessToken, channelId);

  // Reset local pagination and message cache when switching channels
  useEffect(() => {
    setInitialMessages([]);
    setPage(1);
    setHasMore(true);
    setReplyTo(null);
  }, [channelId, setInitialMessages]);

  // Fetch message history from REST API
  const fetchMessageHistory = useCallback(
    async (pageNum = 1, prepend = false) => {
      try {
        setIsLoadingHistory(true);
        const data = await authFetch(
          `/api/channels/${channelId}/chat/messages?page=${pageNum}&limit=50`
        );

        if (data?.messages) {
          if (prepend) {
            // IMPORTANT: Use functional update to avoid race condition with socket events
            // This ensures we always merge with the latest messages state instead of overwriting
            setInitialMessages((currentMessages) => [
              ...data.messages,
              ...currentMessages,
            ]);
          } else {
            setInitialMessages(data.messages);
          }
          setHasMore(data.hasMore);
          setPage(pageNum);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        // Don't show error for initial load - socket will handle it
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [channelId, authFetch, setInitialMessages]
  );

  // Initial fetch
  useEffect(() => {
    if (channelId) {
      fetchMessageHistory(1, false);
    }
  }, [channelId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingHistory) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingHistory]);

  // Mark as read when viewing
  useEffect(() => {
    if (isJoined) {
      markAsRead();
    }
  }, [isJoined, markAsRead]);

  // Handle scroll for loading more
  const handleScroll = () => {
    if (!messagesContainerRef.current || isLoadingHistory || !hasMore) return;

    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      fetchMessageHistory(page + 1, true);
    }
  };

  // Handle send message
  const handleSend = (content, replyToId, mentionedUserIds) => {
    sendMessage(content, replyToId, mentionedUserIds);
    setReplyTo(null);
  };

  // Handle delete message
  const handleDelete = (messageId) => {
    if (window.confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
      deleteMessage(messageId);
    }
  };

  // Handle reply
  const handleReply = (message) => {
    setReplyTo(message);
  };

  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter((u) => u.id !== currentUser?.id);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hôm nay";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    }
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with online status */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-300"
            }`}
            title={isConnected ? "Đã kết nối" : "Đang kết nối..."}
          />
          <span className="text-sm text-gray-500">
            {isConnected
              ? isJoined
                ? `${onlineUsers.length} người đang online`
                : "Đang tham gia..."
              : "Đang kết nối..."}
          </span>
        </div>

        {/* Online users avatars */}
        {onlineUsers.length > 0 && (
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-green-400 to-emerald-500 text-xs font-medium text-white"
                title={user.fullName || user.username}
              >
                {user.fullName?.slice(0, 1) || user.username?.slice(0, 1)}
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
                +{onlineUsers.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Loading indicator */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}

        {/* Load more button */}
        {hasMore && !isLoadingHistory && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => fetchMessageHistory(page + 1, true)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Tải thêm tin nhắn cũ
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <svg
              className="h-16 w-16 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium">Chưa có tin nhắn nào</p>
            <p className="text-sm">Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        )}

        {/* Messages grouped by date */}
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 flex items-center justify-center py-2">
              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                {formatDateHeader(date)}
              </div>
            </div>

            {/* Messages */}
            {dateMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                currentUserId={currentUser?.id}
                onDelete={handleDelete}
                onAddReaction={addReaction}
                onRemoveReaction={removeReaction}
                onReply={handleReply}
                members={members}
              />
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {otherTypingUsers.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span>
                {otherTypingUsers
                  .map((u) => u.fullName || u.username)
                  .join(", ")}{" "}
                đang nhập...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        members={members}
        disabled={!isConnected}
      />
    </div>
  );
}

export default ChannelChat;
