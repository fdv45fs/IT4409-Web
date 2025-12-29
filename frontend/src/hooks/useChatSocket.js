import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Custom hook for Socket.IO chat functionality
 * @param {string} token - JWT access token
 * @param {string} channelId - Channel ID to connect to
 */
export function useChatSocket(token, channelId) {
  const socketRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState(null);

  // Typing timeout ref
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    if (!token) {
      console.log("useChatSocket: No token provided, skipping connection");
      return;
    }

    console.log("useChatSocket: Connecting to", `${SOCKET_URL}/chat`);

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      query: { token }, // Fallback: send token in query params too
      transports: ["polling", "websocket"], // Start with polling for better compatibility
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("Socket connected, id:", socket.id);
    });

    socket.on("connected", (data) => {
      console.log("Authenticated:", data.user);
      setIsConnected(true);
      setError(null);

      // Start heartbeat to keep presence fresh
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        try {
          socket.emit("presence:heartbeat");
        } catch {}
      }, 15000);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      setIsJoined(false);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
      setError("Không thể kết nối đến server chat");
      setIsConnected(false);
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      setError(err.message);
    });

    // Channel events
    socket.on("channel:joined", ({ onlineUsers: users }) => {
      setIsJoined(true);
      setOnlineUsers(users || []);
    });

    socket.on("channel:left", () => {
      setIsJoined(false);
      setOnlineUsers([]);
      setTypingUsers([]);
    });

    // Message events
    socket.on("message:new", ({ message }) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("message:sent", ({ message }) => {
      // Message already added via message:new, just confirmation
      console.log("Message sent:", message.id);
    });

    socket.on("message:deleted", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: undefined } : m
        )
      );
    });

    // Reaction events
    socket.on("reaction:added", ({ messageId, emoji, user }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          // Enforce: mỗi user chỉ có 1 reaction trên 1 message
          const reactions = (m.reactions || [])
            .map((r) => {
              if (!r?.userIds?.includes(user.id)) return r;
              if (r.emoji === emoji) return r;
              return {
                ...r,
                count: Math.max(0, (r.count || 0) - 1),
                userIds: (r.userIds || []).filter((id) => id !== user.id),
              };
            })
            .filter((r) => (r?.count || 0) > 0);

          const existingReaction = reactions.find((r) => r.emoji === emoji);
          if (existingReaction) {
            if (!existingReaction.userIds.includes(user.id)) {
              existingReaction.count++;
              existingReaction.userIds.push(user.id);
            }
          } else {
            reactions.push({ emoji, count: 1, userIds: [user.id] });
          }
          return { ...m, reactions };
        })
      );
    });

    socket.on("reaction:removed", ({ messageId, emoji, user }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = (m.reactions || [])
            .map((r) => {
              if (r.emoji !== emoji) return r;
              // Idempotent: ignore if this user wasn't in userIds
              if (!r.userIds?.includes(user.id)) return r;
              return {
                ...r,
                count: Math.max(0, r.count - 1),
                userIds: r.userIds.filter((id) => id !== user.id),
              };
            })
            .filter((r) => r.count > 0);
          return { ...m, reactions };
        })
      );
    });

    // Typing events
    socket.on("typing:start", ({ user }) => {
      setTypingUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on("typing:stop", ({ user }) => {
      setTypingUsers((prev) => prev.filter((u) => u.id !== user.id));
    });

    // Online status events
    socket.on("user:online", ({ user }) => {
      setOnlineUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on("user:offline", ({ user }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTypingUsers((prev) => prev.filter((u) => u.id !== user.id));
    });

    // Read receipts
    socket.on("messages:read", ({ user, readAt }) => {
      console.log(`${user.username} read messages at ${readAt}`);
    });

    // Cleanup
    return () => {
      // Attempt graceful leave + disconnect
      try {
        if (channelId) socket.emit("channel:leave", { channelId });
      } catch {}
      socket.disconnect();
      socketRef.current = null;
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [token]);

  // Join channel when channelId changes
  useEffect(() => {
    if (!socketRef.current || !isConnected || !channelId) return;

    // Leave previous channel if any
    socketRef.current.emit("channel:leave", { channelId });

    // Join new channel
    socketRef.current.emit("channel:join", { channelId });
    // Wait for server confirmation to update joined state
    setIsJoined(false);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("channel:leave", { channelId });
      }
    };
  }, [channelId, isConnected]);

  // Gracefully disconnect on tab close
  useEffect(() => {
    const handlePageHide = () => {
      try {
        if (socketRef.current) {
          if (channelId) socketRef.current.emit("channel:leave", { channelId });
          socketRef.current.disconnect();
        }
      } catch {}
    };

    window.addEventListener("beforeunload", handlePageHide);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handlePageHide);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [channelId]);

  // Actions
  const sendMessage = useCallback(
    (content, replyToId = null, mentionedUserIds = [], attachmentUrls = []) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !channelId) {
          reject(new Error("Socket not connected or channelId missing"));
          return;
        }

        socketRef.current.emit(
          "message:send",
          {
            channelId,
            message: {
              content,
              replyToId,
              mentionedUserIds,
              attachmentUrls,
            },
          },
          (response) => {
            if (response && response.status === "ok") {
              resolve(response.data);
            } else {
              reject(new Error(response?.message || "Failed to send message"));
            }
          }
        );

        // Stop typing when sending
        if (isTypingRef.current) {
          socketRef.current.emit("typing:stop", { channelId });
          isTypingRef.current = false;
        }
      });
    },
    [channelId]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      if (!socketRef.current || !channelId) return;
      socketRef.current.emit("message:delete", { channelId, messageId });
    },
    [channelId]
  );

  const addReaction = useCallback(
    (messageId, emoji) => {
      if (!socketRef.current || !channelId) return;
      socketRef.current.emit("reaction:add", {
        channelId,
        messageId,
        reaction: { emoji },
      });
    },
    [channelId]
  );

  const removeReaction = useCallback(
    (messageId, emoji) => {
      if (!socketRef.current || !channelId) return;
      socketRef.current.emit("reaction:remove", {
        channelId,
        messageId,
        emoji,
      });
    },
    [channelId]
  );

  const startTyping = useCallback(() => {
    if (!socketRef.current || !channelId || isTypingRef.current) return;

    socketRef.current.emit("typing:start", { channelId });
    isTypingRef.current = true;

    // Auto stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && isTypingRef.current) {
        socketRef.current.emit("typing:stop", { channelId });
        isTypingRef.current = false;
      }
    }, 3000);
  }, [channelId]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current || !channelId || !isTypingRef.current) return;

    socketRef.current.emit("typing:stop", { channelId });
    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [channelId]);

  const markAsRead = useCallback(() => {
    if (!socketRef.current || !channelId) return;
    socketRef.current.emit("messages:read", { channelId });
  }, [channelId]);

  // Set initial messages (from REST API)
  const setInitialMessages = useCallback((initialMessages) => {
    setMessages(initialMessages);
  }, []);

  // Update a specific message (e.g., after adding attachments)
  const updateMessage = useCallback((updatedMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
    );
  }, []);

  return {
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
  };
}

export default useChatSocket;
