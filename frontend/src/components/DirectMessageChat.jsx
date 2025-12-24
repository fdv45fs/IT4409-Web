import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useDMSocket } from "../hooks/useDMSocket";
import { getDirectMessages } from "../api";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

function DirectMessageChat() {
  const { workspaceId, conversationId } = useParams();
  const navigate = useNavigate();
  const { accessToken, currentUser, authFetch } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const [otherUser, setOtherUser] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

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
            setInitialMessages([...data.messages, ...messages]);
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
    [conversationId, workspaceId, authFetch, setInitialMessages, messages]
  );

  // Initial fetch
  useEffect(() => {
    if (conversationId) {
      fetchMessageHistory(1, false);
    }
  }, [conversationId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoined]);

  // Handle scroll for loading more
  const handleScroll = () => {
    if (!messagesContainerRef.current || isLoadingHistory || !hasMore) return;

    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      fetchMessageHistory(page + 1, true);
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
    if (window.confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
      deleteMessage(messageId);
    }
  };

  // Handle reply
  const handleReply = (message) => {
    setReplyTo(message);
  };

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
        <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-lg font-medium">Chọn một cuộc trò chuyện</p>
        <p className="text-sm">hoặc bắt đầu cuộc trò chuyện mới</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with user info */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Back button (mobile) */}
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* User avatar and info */}
          {otherUser && (
            <>
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                  {otherUser.fullName?.[0] || otherUser.username?.[0] || "?"}
                </div>
                {otherParticipantOnline && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {otherUser.fullName || otherUser.username}
                </h2>
                <p className="text-xs text-gray-500">
                  {otherParticipantOnline ? (
                    <span className="text-green-600">Đang hoạt động</span>
                  ) : (
                    "Không hoạt động"
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`}
            title={isConnected ? "Đã kết nối" : "Đang kết nối..."}
          />
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
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
              {otherUser.fullName?.[0] || otherUser.username?.[0] || "?"}
            </div>
            <p className="text-lg font-medium text-gray-700">
              {otherUser.fullName || otherUser.username}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Đây là khởi đầu cuộc trò chuyện với {otherUser.fullName || otherUser.username}
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
              <ChatMessage
                key={message.id}
                message={message}
                currentUserId={currentUser?.id}
                onDelete={handleDelete}
                onAddReaction={addReaction}
                onRemoveReaction={removeReaction}
                onReply={handleReply}
                members={[]}
              />
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUser && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
              </div>
              <span>{typingUser.fullName || typingUser.username} đang nhập...</span>
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
        members={[]}
        disabled={!isConnected}
        placeholder={otherUser ? `Nhắn tin cho ${otherUser.fullName || otherUser.username}...` : "Nhập tin nhắn..."}
      />
    </div>
  );
}

export default DirectMessageChat;

