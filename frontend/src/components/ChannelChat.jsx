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
  const messageRefs = useRef({});
  const highlightTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Debug: Log token status
  useEffect(() => {
    console.log("ChannelChat: accessToken available:", !!accessToken);
    console.log("ChannelChat: currentUser:", currentUser?.username);
    console.log("ChannelChat: channelId:", channelId);
  }, [accessToken, currentUser, channelId]);

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isJumping, setIsJumping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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
    // Clean up refs and state when switching channels
    messageRefs.current = {};
    setInitialMessages([]);
    setPage(1);
    setHasMore(true);
    setReplyTo(null);
    // Next render should pin to bottom without animation
    isInitialLoadRef.current = true;
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
            const container = messagesContainerRef.current;
            const prevScrollHeight = container?.scrollHeight || 0;
            const prevScrollTop = container?.scrollTop || 0;

            setInitialMessages((currentMessages) => [
              ...data.messages,
              ...currentMessages,
            ]);

            // Preserve viewport position after prepending older messages
            setTimeout(() => {
              if (!container) return;
              const newScrollHeight = container.scrollHeight;
              const heightDelta = newScrollHeight - prevScrollHeight;
              container.scrollTop = prevScrollTop + heightDelta;
            }, 0);
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
    if (isLoadingHistory) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 5;

    // On initial load (after switching channels), jump to bottom instantly
    if (isInitialLoadRef.current) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      isInitialLoadRef.current = false;
      return;
    }

    // Only auto-scroll on new messages if user is already near the bottom
    if (isNearBottom && messagesEndRef.current) {
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
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;

    // Load more messages when scrolled to top
    if (scrollTop === 0 && !isLoadingHistory && hasMore) {
      fetchMessageHistory(page + 1, true);
    }

    // Show scroll-to-bottom button when user scrolls up (more than 200px from bottom)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 200);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  const handleJumpToMessage = async (messageId) => {
    if (!messageId) return;

    // Clear any existing highlight timeout before setting a new one
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    const targetEl = messageRefs.current[messageId];

    // If message exists in DOM, scroll to it immediately
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightMessageId(messageId);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightMessageId(null);
        highlightTimeoutRef.current = null;
      }, 1500);
      return;
    }

    // Message not in current list - fetch with context
    try {
      setIsJumping(true);
      const { getChannelMessageById } = await import("../api");

      // First verify the message exists
      const targetMessage = await getChannelMessageById(
        channelId,
        messageId,
        authFetch
      );

      if (!targetMessage) {
        window.dispatchEvent(
          new CustomEvent("show:toast", {
            detail: {
              message: "Không tìm thấy tin nhắn",
              type: "error",
            },
          })
        );
        return;
      }

      // Fetch messages around the target (25 before + 25 after = ~50 total)
      const beforeData = await authFetch(
        `/api/channels/${channelId}/chat/messages?beforeId=${messageId}&limit=25`
      );
      const afterData = await authFetch(
        `/api/channels/${channelId}/chat/messages?afterId=${messageId}&limit=25`
      );

      // Combine: before + target + after
      const contextMessagesRaw = [
        ...(beforeData?.messages || []),
        targetMessage,
        ...(afterData?.messages || []),
      ];
      // Sort by createdAt ascending to ensure proper chronological order
      const contextMessages = contextMessagesRaw
        .filter(Boolean)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Replace current messages with context
      setInitialMessages(contextMessages);
      setPage(1);
      setHasMore(false); // Disable pagination when jumping to specific message

      // Wait for DOM to update, then scroll
      setTimeout(() => {
        const el = messageRefs.current[messageId];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightMessageId(messageId);
          highlightTimeoutRef.current = setTimeout(() => {
            setHighlightMessageId(null);
            highlightTimeoutRef.current = null;
          }, 1500);
        }
      }, 100);
    } catch (error) {
      console.error("Failed to jump to message:", error);
      window.dispatchEvent(
        new CustomEvent("show:toast", {
          detail: {
            message: "Không thể tải tin nhắn. Vui lòng thử lại.",
            type: "error",
          },
        })
      );
    } finally {
      setIsJumping(false);
    }
  };

  // Cleanup highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

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
    <div className="flex h-full flex-col bg-white relative">
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
              <div
                key={message.id}
                ref={(el) => {
                  if (el) messageRefs.current[message.id] = el;
                }}
              >
                <ChatMessage
                  message={message}
                  currentUserId={currentUser?.id}
                  onDelete={handleDelete}
                  onAddReaction={addReaction}
                  onRemoveReaction={removeReaction}
                  onReply={handleReply}
                  onJumpToMessage={handleJumpToMessage}
                  isHighlighted={highlightMessageId === message.id}
                  members={members}
                />
              </div>
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

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
          title="Đi đến tin nhắn mới nhất"
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
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          <span>Tin nhắn mới</span>
        </button>
      )}

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
