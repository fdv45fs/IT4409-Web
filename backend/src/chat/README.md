# Chat Module - Real-time với Socket.IO

## 🚀 Công nghệ sử dụng

| Công nghệ | Version | Mô tả |
|-----------|---------|-------|
| **NestJS WebSockets** | ^11.x | WebSocket framework |
| **Socket.IO** | ^4.x | Real-time engine |
| **JWT** | - | Xác thực WebSocket |
| **Prisma** | ^6.x | ORM |

## 🔐 Xác thực WebSocket với JWT

Client cần gửi JWT token khi connect. Có 3 cách:

### Cách 1: Auth header (Recommended)
```javascript
const socket = io('http://localhost:3000/chat', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});
```

### Cách 2: Auth object
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: token
  }
});
```

### Cách 3: Query params
```javascript
const socket = io(`http://localhost:3000/chat?token=${token}`);
```

## 📡 Socket.IO Events

### Client → Server (Emit)

| Event | Payload | Mô tả |
|-------|---------|-------|
| `channel:join` | `{ channelId: string }` | Join vào channel room |
| `channel:leave` | `{ channelId: string }` | Rời khỏi channel room |
| `message:send` | `{ channelId: string, message: CreateMessageDto }` | Gửi tin nhắn |
| `message:delete` | `{ channelId: string, messageId: string }` | Xóa tin nhắn |
| `reaction:add` | `{ channelId: string, messageId: string, reaction: { emoji: string } }` | Thêm reaction |
| `reaction:remove` | `{ channelId: string, messageId: string, emoji: string }` | Xóa reaction |
| `typing:start` | `{ channelId: string }` | Bắt đầu gõ |
| `typing:stop` | `{ channelId: string }` | Dừng gõ |
| `messages:read` | `{ channelId: string }` | Đánh dấu đã đọc |
| `users:online` | `{ channelId: string }` | Lấy danh sách online |

### Server → Client (Listen)

| Event | Payload | Mô tả |
|-------|---------|-------|
| `connected` | `{ message, user }` | Kết nối thành công |
| `error` | `{ message, event? }` | Lỗi xảy ra |
| `channel:joined` | `{ channelId, onlineUsers }` | Đã join channel |
| `channel:left` | `{ channelId }` | Đã rời channel |
| `message:new` | `{ channelId, message }` | Tin nhắn mới |
| `message:sent` | `{ channelId, message }` | Xác nhận đã gửi |
| `message:deleted` | `{ channelId, messageId, deletedBy }` | Tin nhắn bị xóa |
| `reaction:added` | `{ channelId, messageId, emoji, user }` | Reaction mới |
| `reaction:removed` | `{ channelId, messageId, emoji, user }` | Reaction bị xóa |
| `typing:start` | `{ channelId, user }` | Ai đó đang gõ |
| `typing:stop` | `{ channelId, user }` | Ai đó dừng gõ |
| `user:online` | `{ channelId, user }` | User online |
| `user:offline` | `{ channelId, user }` | User offline |
| `messages:read` | `{ channelId, user, readAt }` | User đã đọc |
| `users:online:list` | `{ channelId, onlineUsers }` | Danh sách online |

## 💻 Ví dụ Client Code (React)

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';

// Hook custom cho Socket.IO
export function useChatSocket(token: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    // Tạo connection
    const socket = io('http://localhost:3000/chat', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    socket.on('connected', (data) => {
      setIsConnected(true);
      console.log('Authenticated:', data.user);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Message events
    socket.on('message:new', ({ message }) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('message:deleted', ({ messageId }) => {
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, isDeleted: true } : m)
      );
    });

    // Typing events
    socket.on('typing:start', ({ user }) => {
      setTypingUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('typing:stop', ({ user }) => {
      setTypingUsers(prev => prev.filter(u => u.id !== user.id));
    });

    // Online status
    socket.on('user:online', ({ user }) => {
      setOnlineUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user:offline', ({ user }) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== user.id));
    });

    socket.on('channel:joined', ({ onlineUsers: users }) => {
      setOnlineUsers(users);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Actions
  const joinChannel = (channelId: string) => {
    socketRef.current?.emit('channel:join', { channelId });
  };

  const leaveChannel = (channelId: string) => {
    socketRef.current?.emit('channel:leave', { channelId });
  };

  const sendMessage = (channelId: string, content: string, replyToId?: string) => {
    socketRef.current?.emit('message:send', {
      channelId,
      message: { content, replyToId },
    });
  };

  const deleteMessage = (channelId: string, messageId: string) => {
    socketRef.current?.emit('message:delete', { channelId, messageId });
  };

  const addReaction = (channelId: string, messageId: string, emoji: string) => {
    socketRef.current?.emit('reaction:add', {
      channelId,
      messageId,
      reaction: { emoji },
    });
  };

  const startTyping = (channelId: string) => {
    socketRef.current?.emit('typing:start', { channelId });
  };

  const stopTyping = (channelId: string) => {
    socketRef.current?.emit('typing:stop', { channelId });
  };

  return {
    isConnected,
    messages,
    typingUsers,
    onlineUsers,
    joinChannel,
    leaveChannel,
    sendMessage,
    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
  };
}
```

## 🔧 REST API Endpoints (vẫn giữ)

REST API vẫn hoạt động song song với WebSocket:

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/channels/:channelId/chat/messages` | Lấy tin nhắn (có pagination) |
| `POST` | `/api/channels/:channelId/chat/messages` | Gửi tin nhắn |
| `DELETE` | `/api/channels/:channelId/chat/messages/:id` | Xóa tin nhắn |
| `POST` | `/api/channels/:channelId/chat/messages/:id/reactions` | Thêm reaction |

## 📝 Notes

1. **Namespace**: WebSocket sử dụng namespace `/chat`
2. **Room**: Mỗi channel là một Socket.IO room `channel:{channelId}`
3. **Authentication**: Token được verify mỗi lần connect và mỗi event (qua Guard)
4. **Persistence**: Messages được lưu vào DB, WebSocket chỉ broadcast real-time

