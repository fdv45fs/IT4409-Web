import { useEffect, useRef, useState, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import { useChatSocket } from "../hooks/useChatSocket";
import { useToast } from "../contexts/ToastContext";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChatSearchBar from "./ChatSearchBar";
import ConfirmationModal from "./ConfirmationModal";
import { uploadMessageFiles, searchChannelMessages } from "../api";

function ChannelChat({
  channelId,
  channelName,
  members = [],
  onOnlineUsersChange,
  searchInputRef,
  searchFocusSignal,
  isSearchOpen = true,
}) {
  const { accessToken, currentUser, authFetch } = useAuth();
  const { addToast } = useToast();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const forceScrollToBottomRef = useRef(false);

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isJumping, setIsJumping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    messageId: null,
  });

  useEffect(() => {
    if (isSearchOpen) return;
    // When search is closed, reset search state so the main timeline is visible.
    if (searchQuery) setSearchQuery("");
    if (searchResults.length) setSearchResults([]);
    if (isSearching) setIsSearching(false);
  }, [isSearchOpen, searchQuery, searchResults.length, isSearching]);

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
    updateMessage,
  } = useChatSocket(accessToken, channelId);

  const handleAddReaction = useCallback(
    (messageId, emoji) => {
      const userId = currentUser?.id;
      if (userId) {
        // Optimistic UI update
        setInitialMessages((prev) =>
          (prev || []).map((m) => {
            if (m.id !== messageId) return m;
            // Enforce: mỗi user chỉ có 1 reaction trên 1 message
            const cleaned = (m.reactions || [])
              .map((r) => {
                if (!r?.userIds?.includes(userId)) return r;
                return {
                  ...r,
                  count: Math.max(0, (r.count || 0) - 1),
                  userIds: (r.userIds || []).filter((id) => id !== userId),
                };
              })
              .filter((r) => (r?.count || 0) > 0);

            const reactions = [...cleaned];
            let reaction = reactions.find((r) => r.emoji === emoji);
            if (!reaction) {
              reaction = { emoji, count: 0, userIds: [] };
              reactions.push(reaction);
            }

            if (!reaction.userIds?.includes(userId)) {
              reaction.count += 1;
              reaction.userIds = [...(reaction.userIds || []), userId];
            }

            return { ...m, reactions };
          })
        );
      }

      addReaction(messageId, emoji);
    },
    [addReaction, currentUser?.id, setInitialMessages]
  );

  const handleRemoveReaction = useCallback(
    (messageId, emoji) => {
      const userId = currentUser?.id;
      if (userId) {
        // Optimistic UI update
        setInitialMessages((prev) =>
          (prev || []).map((m) => {
            if (m.id !== messageId) return m;
            const reactions = (m.reactions || [])
              .map((r) => {
                if (r.emoji !== emoji) return r;
                if (!r.userIds?.includes(userId)) return r;
                return {
                  ...r,
                  count: Math.max(0, (r.count || 0) - 1),
                  userIds: (r.userIds || []).filter((id) => id !== userId),
                };
              })
              .filter((r) => (r.count || 0) > 0);
            return { ...m, reactions };
          })
        );
      }

      removeReaction(messageId, emoji);
    },
    [currentUser?.id, removeReaction, setInitialMessages]
  );

  useEffect(() => {
    if (typeof onOnlineUsersChange !== "function") return;
    onOnlineUsersChange(onlineUsers);
  }, [onlineUsers, onOnlineUsersChange]);

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

    // If we just sent a message, always scroll to bottom.
    if (forceScrollToBottomRef.current) {
      forceScrollToBottomRef.current = false;
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } else {
        container.scrollTop = container.scrollHeight;
      }
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
    forceScrollToBottomRef.current = true;
    sendMessage(content, replyToId, mentionedUserIds);
    setReplyTo(null);
  };

  // Handle send message with files
  const handleSendWithFiles = async (
    content,
    replyToId,
    mentionedUserIds,
    files
  ) => {
    try {
      forceScrollToBottomRef.current = true;
      // Send text message first
      const message = await sendMessage(content, replyToId, mentionedUserIds);

      // If has files, upload them
      if (files.length > 0 && message?.id) {
        const result = await uploadMessageFiles(
          channelId,
          message.id,
          files,
          authFetch
        );
        // Update the message in local state with attachments
        if (result?.message) {
          updateMessage(result.message);
        }
      }

      setReplyTo(null);
    } catch (error) {
      console.error("Failed to send message with files:", error);
      addToast("Unable to send message with attachments", "error");
    }
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

  // Handle search
  const performSearch = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchChannelMessages(
          channelId,
          query,
          authFetch
        );
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [channelId, authFetch]
  );

  const handleSearchResultClick = (messageId) => {
    if (!messageId) return;
    // Keep the search bar visible, but clear the query so the main timeline renders.
    setSearchQuery("");
    setSearchResults([]);
    setTimeout(() => {
      handleJumpToMessage(messageId);
    }, 0);
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
              message: "Message not found",
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
            message: "Unable to load message. Please try again.",
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
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col bg-white relative">
      {isSearchOpen && (
        <ChatSearchBar
          onSearch={performSearch}
          value={searchQuery}
          onValueChange={setSearchQuery}
          inputRef={searchInputRef}
          focusSignal={searchFocusSignal}
          isSearching={isSearching}
        />
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50"
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
              Load more messages
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
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        )}

        {/* Messages or Search Results */}
        {searchQuery ? (
          // Search results
          <div className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Results for "{searchQuery}"
              </span>
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600"></div>
              )}
            </div>
            {searchResults.length > 0 ? (
              searchResults.map((message) => (
                <div
                  key={message.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest("button")) return;
                    handleSearchResultClick(message.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    if (e.target.closest("button")) return;
                    e.preventDefault();
                    handleSearchResultClick(message.id);
                  }}
                  className="mb-2 block w-full text-left"
                  title="Click to jump to message"
                >
                  <ChatMessage
                    message={message}
                    currentUserId={currentUser?.id}
                    onDelete={handleDelete}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    onReply={handleReply}
                    onJumpToMessage={handleJumpToMessage}
                    isHighlighted={false}
                    members={members}
                  />
                </div>
              ))
            ) : !isSearching ? (
              <p className="text-sm text-gray-500">
                Cannot find any messages matching "{searchQuery}".
              </p>
            ) : null}
          </div>
        ) : (
          // Normal messages grouped by date
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
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
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    onReply={handleReply}
                    onJumpToMessage={handleJumpToMessage}
                    isHighlighted={highlightMessageId === message.id}
                    members={members}
                  />
                </div>
              ))}
            </div>
          ))
        )}

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
                is typing...
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
          className="absolute bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
          title="Go to latest message"
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
          <span>New messages</span>
        </button>
      )}

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        onSendWithFiles={handleSendWithFiles}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        members={members}
        disabled={!isConnected}
      />

      {/* Delete Message Confirmation */}
      <ConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, messageId: null })}
        onConfirm={confirmDelete}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default ChannelChat;
