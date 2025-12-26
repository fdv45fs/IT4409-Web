import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useDMSocket } from "../hooks/useDMSocket";
import { getDirectMessages } from "../api";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ConfirmationModal from "./ConfirmationModal";

function DirectMessageChat() {
  const { workspaceId, conversationId } = useParams();
  const navigate = useNavigate();
  const { accessToken, currentUser, authFetch } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const [otherUser, setOtherUser] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isJumping, setIsJumping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    messageId: null,
  });
  const [highlightMessageId, setHighlightMessageId] = useState(null);

  const {
    isConnected,
    isJoined,
    messages,
    typingUser,
    otherParticipantOnline,
    error,
    sendMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    markAsRead,
    setInitialMessages,
  } = useDMSocket(accessToken, conversationId, workspaceId);

  // Presence state that can be updated via global presence events
  const [presenceOnline, setPresenceOnline] = useState(false);

  // Sync initial presence from socket join
  useEffect(() => {
    setPresenceOnline(otherParticipantOnline || false);
  }, [otherParticipantOnline]);

  // Listen to global presence events to update status even when user hasn't opened this DM
  useEffect(() => {
    const handler = (event) => {
      if (!otherUser) return;
      if (event.detail.userId === otherUser.id) {
        setPresenceOnline(event.detail.isOnline);
      }
    };

    window.addEventListener("presence:user:update", handler);
    return () => window.removeEventListener("presence:user:update", handler);
  }, [otherUser]);

  // Reset local state when switching conversations
  useEffect(() => {
    // Clean up refs and state when switching conversations
    messageRefs.current = {};
    setPresenceOnline(false);
    setInitialMessages([]);
    setPage(1);
    setHasMore(true);
    setReplyTo(null);
    // Next render should pin to bottom without animation
    isInitialLoadRef.current = true;
  }, [conversationId, setInitialMessages]);

  // Fetch conversation details
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        // Get conversation list to find this conversation's details
        const { getDirectConversations } = await import("../api");
        const data = await getDirectConversations(workspaceId, authFetch);
        const conv = data.conversations?.find((c) => c.id === conversationId);
        if (conv) {
          setOtherUser(conv.otherParticipant);
          // Initialize presence from list data in case socket presence hasn't arrived yet
          if (typeof conv.otherParticipant?.isOnline === "boolean") {
            setPresenceOnline(conv.otherParticipant.isOnline);
          }
        }
      } catch (err) {
        console.error("Failed to fetch conversation:", err);
      }
    };

    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId, workspaceId, authFetch]);

  // Fetch message history from REST API
  const fetchMessageHistory = useCallback(
    async (pageNum = 1, prepend = false) => {
      if (!conversationId) return;

      try {
        setIsLoadingHistory(true);
        const data = await getDirectMessages(
          workspaceId,
          conversationId,
          { page: pageNum, limit: 50 },
          authFetch
        );

        if (data?.messages) {
          if (prepend) {
            // Use functional update to access current messages without depending on them
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
        console.error("Failed to fetch DM messages:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [conversationId, workspaceId, authFetch, setInitialMessages]
  );

  // Initial fetch
  useEffect(() => {
    if (conversationId) {
      fetchMessageHistory(1, false);
    }
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isLoadingHistory) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 5;

    // On initial load (after switching conversations), jump to bottom instantly
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoined]);

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
  const handleSend = (content, replyToId) => {
    if (!otherUser) return;
    sendMessage(content, otherUser.id, replyToId);
    setReplyTo(null);
  };

  // Handle delete message
  const handleDelete = (messageId) => {
    setDeleteConfirmModal({ isOpen: true, messageId });
  };

  const confirmDelete = () => {
    if (deleteConfirmModal.messageId) {
      deleteMessage(deleteConfirmModal.messageId);
      setDeleteConfirmModal({ isOpen: false, messageId: null });
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
      const { getDirectMessageById, getDirectMessages } = await import(
        "../api"
      );

      // First verify the message exists
      const targetMessage = await getDirectMessageById(
        workspaceId,
        conversationId,
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
      const beforeData = await getDirectMessages(
        workspaceId,
        conversationId,
        { beforeId: messageId, limit: 25 },
        authFetch
      );
      const afterData = await getDirectMessages(
        workspaceId,
        conversationId,
        { afterId: messageId, limit: 25 },
        authFetch
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

  if (!conversationId) {
    return (
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
        <p className="text-lg font-medium">Chọn một cuộc trò chuyện</p>
        <p className="text-sm">hoặc bắt đầu cuộc trò chuyện mới</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white relative">
      {/* Header with user info */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Back button (mobile) */}
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
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

          {/* User avatar and info */}
          {otherUser && (
            <>
              <div className="relative">
                {otherUser.avatarUrl ? (
                  <img
                    src={otherUser.avatarUrl}
                    alt={otherUser.fullName || otherUser.username}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                    {otherUser.fullName?.[0] || otherUser.username?.[0] || "?"}
                  </div>
                )}
                <div
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    presenceOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {otherUser.fullName || otherUser.username}
                </h2>
                <p className="text-xs text-gray-500">
                  {presenceOnline ? (
                    <span className="text-green-600">Đang hoạt động</span>
                  ) : (
                    "Không hoạt động"
                  )}
                </p>
              </div>
            </>
          )}
        </div>
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
        {!isLoadingHistory && messages.length === 0 && otherUser && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-gray-400">
            {otherUser.avatarUrl ? (
              <img
                src={otherUser.avatarUrl}
                alt={otherUser.fullName || otherUser.username}
                className="mb-4 h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
                {otherUser.fullName?.[0] || otherUser.username?.[0] || "?"}
              </div>
            )}
            <p className="text-lg font-medium text-gray-700">
              {otherUser.fullName || otherUser.username}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Đây là khởi đầu cuộc trò chuyện với{" "}
              {otherUser.fullName || otherUser.username}
            </p>
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
                  members={[]}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUser && (
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
                {typingUser.fullName || typingUser.username} đang nhập...
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
        members={[]}
        disabled={!isConnected}
        placeholder={
          otherUser
            ? `Nhắn tin cho ${otherUser.fullName || otherUser.username}...`
            : "Nhập tin nhắn..."
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() =>
          setDeleteConfirmModal({ isOpen: false, messageId: null })
        }
        onConfirm={confirmDelete}
        title="Xóa tin nhắn"
        message="Bạn có chắc muốn xóa tin nhắn này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
      />
    </div>
  );
}

export default DirectMessageChat;
