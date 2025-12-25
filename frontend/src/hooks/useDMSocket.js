import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Custom hook for Direct Messaging Socket.IO functionality
 * @param {string} token - JWT access token
 * @param {string} conversationId - Conversation ID to connect to
 * @param {string} workspaceId - Workspace ID
 */
export function useDMSocket(token, conversationId, workspaceId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [otherParticipantOnline, setOtherParticipantOnline] = useState(false);
  const [error, setError] = useState(null);

  // Typing timeout ref
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const upsertMessage = useCallback((incomingMessage) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === incomingMessage.id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = incomingMessage;
        return next;
      }
      return [...prev, incomingMessage];
    });
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!token) {
      console.log("useDMSocket: No token provided, skipping connection");
      return;
    }

    console.log("useDMSocket: Connecting to", `${SOCKET_URL}/chat`);

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      query: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("DM Socket connected, id:", socket.id);
    });

    socket.on("connected", (data) => {
      console.log("DM Authenticated:", data.user);
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("DM Socket disconnected:", reason);
      setIsConnected(false);
      setIsJoined(false);
    });

    socket.on("connect_error", (err) => {
      console.error("DM Connection error:", err.message);
      setError("Không thể kết nối đến server chat");
      setIsConnected(false);
    });

    socket.on("error", (err) => {
      console.error("DM Socket error:", err);
      setError(err.message);
    });

    // DM Join/Leave events
    socket.on("dm:joined", ({ otherParticipantOnline: online }) => {
      setIsJoined(true);
      setOtherParticipantOnline(online);
    });

    socket.on("dm:left", () => {
      setIsJoined(false);
      setTypingUser(null);
    });

    // DM Message events
    socket.on("dm:message:new", ({ message }) => {
      upsertMessage(message);
    });

    socket.on("dm:message:sent", ({ message }) => {
      console.log("DM Message sent:", message.id);
    });

    socket.on("dm:message:notification", ({ message }) => {
      // New message notification when not in room
      upsertMessage(message);
    });

    socket.on("dm:message:deleted", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: undefined } : m
        )
      );
    });

    // DM Reaction events
    socket.on("dm:reaction:added", ({ messageId, emoji, user }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = [...(m.reactions || [])];
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

    socket.on("dm:reaction:removed", ({ messageId, emoji, user }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = (m.reactions || [])
            .map((r) => {
              if (r.emoji !== emoji) return r;
              return {
                ...r,
                count: r.count - 1,
                userIds: r.userIds.filter((id) => id !== user.id),
              };
            })
            .filter((r) => r.count > 0);
          return { ...m, reactions };
        })
      );
    });

    // DM Typing events
    socket.on("dm:typing:start", ({ user }) => {
      setTypingUser(user);
    });

    socket.on("dm:typing:stop", () => {
      setTypingUser(null);
    });

    // DM Online status events
    socket.on("dm:user:online", () => {
      setOtherParticipantOnline(true);
    });

    socket.on("dm:user:offline", () => {
      setOtherParticipantOnline(false);
      setTypingUser(null);
    });

    // DM Read receipts
    socket.on("dm:messages:read", ({ user, readAt }) => {
      console.log(`DM: ${user.username} read messages at ${readAt}`);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, upsertMessage]);

  // Join conversation when conversationId changes
  useEffect(() => {
    if (!socketRef.current || !isConnected || !conversationId) return;

    // Leave previous conversation if any
    socketRef.current.emit("dm:leave", { conversationId });

    // Join new conversation
    socketRef.current.emit("dm:join", { conversationId });
    // Wait for server confirmation before marking as joined
    setIsJoined(false);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("dm:leave", { conversationId });
      }
    };
  }, [conversationId, isConnected]);

  // Actions
  const sendMessage = useCallback(
    (content, recipientId, replyToId = null, attachmentUrls = []) => {
      if (!socketRef.current || !workspaceId) return;

      socketRef.current.emit("dm:message:send", {
        workspaceId,
        conversationId,
        recipientId,
        content,
        replyToId,
        attachmentUrls,
      });

      // Stop typing when sending
      if (isTypingRef.current) {
        socketRef.current.emit("dm:typing:stop", { conversationId });
        isTypingRef.current = false;
      }
    },
    [conversationId, workspaceId]
  );

  const deleteMessage = useCallback(
    (messageId) => {
      if (!socketRef.current || !conversationId) return;
      socketRef.current.emit("dm:message:delete", {
        conversationId,
        messageId,
      });
    },
    [conversationId]
  );

  const addReaction = useCallback(
    (messageId, emoji) => {
      if (!socketRef.current || !conversationId) return;
      socketRef.current.emit("dm:reaction:add", {
        conversationId,
        messageId,
        reaction: { emoji },
      });
    },
    [conversationId]
  );

  const removeReaction = useCallback(
    (messageId, emoji) => {
      if (!socketRef.current || !conversationId) return;
      socketRef.current.emit("dm:reaction:remove", {
        conversationId,
        messageId,
        emoji,
      });
    },
    [conversationId]
  );

  const startTyping = useCallback(() => {
    if (!socketRef.current || !conversationId || isTypingRef.current) return;

    socketRef.current.emit("dm:typing:start", { conversationId });
    isTypingRef.current = true;

    // Auto stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && isTypingRef.current) {
        socketRef.current.emit("dm:typing:stop", { conversationId });
        isTypingRef.current = false;
      }
    }, 3000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current || !conversationId || !isTypingRef.current) return;

    socketRef.current.emit("dm:typing:stop", { conversationId });
    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [conversationId]);

  const markAsRead = useCallback(() => {
    if (!socketRef.current || !conversationId) return;
    socketRef.current.emit("dm:messages:read", { conversationId });
  }, [conversationId]);

  // Set initial messages (from REST API)
  const setInitialMessages = useCallback((initialMessages) => {
    // Support both direct set and functional update patterns
    if (typeof initialMessages === "function") {
      setMessages(initialMessages);
    } else {
      setMessages(initialMessages);
    }
  }, []);

  return {
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
  };
}

export default useDMSocket;
