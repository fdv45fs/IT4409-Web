import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { WsJwtGuard, validateSocketToken } from './ws-jwt.guard';
import type { AuthenticatedSocket } from './ws-jwt.guard';
import { CreateMessageDto } from './dtos/create-message.dto';
import { AddReactionDto } from './dtos/add-reaction.dto';
import { SendDirectMessageDto } from './dtos/send-direct-message.dto';

interface OnlineUser {
  userId: string;
  username: string;
  fullName: string;
  socketIds: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  // Track online users per channel: Map<channelId, Map<userId, OnlineUser>>
  private channelUsers = new Map<string, Map<string, OnlineUser>>();

  // Track which channels each socket is in: Map<socketId, Set<channelId>>
  private socketChannels = new Map<string, Set<string>>();

  // Track userId to socketIds: Map<userId, Set<socketId>>
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  afterInit() {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`New connection attempt: ${client.id}`);
      this.logger.log(
        `Auth data: ${JSON.stringify(client.handshake.auth || {})}`,
      );
      this.logger.log(
        `Query data: ${JSON.stringify(client.handshake.query || {})}`,
      );
      this.logger.log(
        `Headers auth: ${client.handshake.headers?.authorization || 'none'}`,
      );

      const user = await validateSocketToken(
        client,
        this.jwtService,
        this.prisma,
      );

      if (!user) {
        this.logger.warn(
          `Unauthorized connection attempt: ${client.id} - No valid user from token`,
        );
        client.emit('error', {
          message: 'Unauthorized - Invalid or missing token',
        });
        client.disconnect();
        return;
      }

      // Gắn user info vào socket
      (client as AuthenticatedSocket).user = user;

      // Track user socket
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Broadcast global presence online (workspace-agnostic)
      this.server.emit('presence:user:online', { userId: user.id });

      // Send current online list to this client
      client.emit('presence:user:list', {
        userIds: Array.from(this.userSockets.keys()),
      });

      // Initialize socket channels tracking
      this.socketChannels.set(client.id, new Set());

      // Cập nhật user presence thành online
      await this.prisma.userPresence.upsert({
        where: { userId: user.id },
        update: { status: 'online', updatedAt: new Date() },
        create: { userId: user.id, status: 'online' },
      });

      this.logger.log(
        `Client connected: ${client.id} (User: ${user.username})`,
      );

      // Emit connection success
      client.emit('connected', {
        message: 'Connected successfully',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        },
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = (client as AuthenticatedSocket).user;

    if (user) {
      // Remove socket from user's socket set
      const userSocketSet = this.userSockets.get(user.id);
      if (userSocketSet) {
        userSocketSet.delete(client.id);

        // If user has no more sockets, mark as offline
        if (userSocketSet.size === 0) {
          this.userSockets.delete(user.id);

          // Broadcast global presence offline (workspace-agnostic)
          this.server.emit('presence:user:offline', { userId: user.id });

          // Update presence to offline
          await this.prisma.userPresence.upsert({
            where: { userId: user.id },
            update: {
              status: 'offline',
              lastSeen: new Date(),
              updatedAt: new Date(),
            },
            create: {
              userId: user.id,
              status: 'offline',
              lastSeen: new Date(),
            },
          });
        }
      }

      // Leave all channels this socket was in
      const channels = this.socketChannels.get(client.id);
      if (channels) {
        for (const channelId of channels) {
          this.removeUserFromChannel(user.id, channelId, client.id);

          // Notify channel members
          this.server.to(`channel:${channelId}`).emit('user:offline', {
            channelId,
            user: {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
            },
          });
        }
      }

      this.socketChannels.delete(client.id);
      this.logger.log(
        `Client disconnected: ${client.id} (User: ${user.username})`,
      );
    }
  }

  /**
   * Join a channel room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('channel:join')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const user = client.user;

    try {
      // Verify user is member of channel
      const isMember = await this.isChannelMember(user.id, channelId);
      if (!isMember) {
        client.emit('error', {
          message: 'Bạn không phải thành viên của channel này',
        });
        return;
      }

      // Join Socket.IO room
      client.join(`channel:${channelId}`);

      // Track user in channel
      this.addUserToChannel(user, channelId, client.id);

      // Track channel for this socket
      this.socketChannels.get(client.id)?.add(channelId);

      // Get online users in channel
      const onlineUsers = this.getOnlineUsersInChannel(channelId);

      // Notify channel members about new online user
      this.server.to(`channel:${channelId}`).emit('user:online', {
        channelId,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        },
      });

      // Send success response with online users list
      client.emit('channel:joined', {
        channelId,
        onlineUsers,
      });

      this.logger.log(`User ${user.username} joined channel ${channelId}`);
    } catch (error) {
      this.logger.error(`Error joining channel: ${error.message}`);
      client.emit('error', { message: 'Không thể tham gia channel' });
    }
  }

  /**
   * Leave a channel room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('channel:leave')
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const user = client.user;

    // Leave Socket.IO room
    client.leave(`channel:${channelId}`);

    // Remove from tracking
    this.removeUserFromChannel(user.id, channelId, client.id);
    this.socketChannels.get(client.id)?.delete(channelId);

    // Notify channel members
    this.server.to(`channel:${channelId}`).emit('user:offline', {
      channelId,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
    });

    client.emit('channel:left', { channelId });
    this.logger.log(`User ${user.username} left channel ${channelId}`);
  }

  /**
   * Send a message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; message: CreateMessageDto },
  ) {
    const { channelId, message } = data;
    const user = client.user;

    try {
      // Use ChatService to create message (handles all validation)
      const newMessage = await this.chatService.sendMessage(
        user.id,
        channelId,
        message,
      );

      // Broadcast to all users in channel
      this.server.to(`channel:${channelId}`).emit('message:new', {
        channelId,
        message: newMessage,
      });

      // Send confirmation to sender
      client.emit('message:sent', {
        channelId,
        message: newMessage,
      });

      this.logger.log(
        `Message sent by ${user.username} in channel ${channelId}`,
      );
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', {
        event: 'message:send',
        message: error.message || 'Không thể gửi tin nhắn',
      });
    }
  }

  /**
   * Delete a message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; messageId: string },
  ) {
    const { channelId, messageId } = data;
    const user = client.user;

    try {
      await this.chatService.deleteMessage(user.id, channelId, messageId);

      // Broadcast deletion to channel
      this.server.to(`channel:${channelId}`).emit('message:deleted', {
        channelId,
        messageId,
        deletedBy: {
          id: user.id,
          username: user.username,
        },
      });

      client.emit('message:delete:success', { channelId, messageId });
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      client.emit('error', {
        event: 'message:delete',
        message: error.message || 'Không thể xóa tin nhắn',
      });
    }
  }

  /**
   * Toggle reaction to message
   * If user already reacted with this emoji, removes the reaction.
   * If user hasn't reacted yet, adds the reaction.
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('reaction:add')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { channelId: string; messageId: string; reaction: AddReactionDto },
  ) {
    const { channelId, messageId, reaction } = data;
    const user = client.user;

    try {
      const result = await this.chatService.addReaction(
        user.id,
        channelId,
        messageId,
        reaction,
      );

      // Broadcast reaction to channel based on action
      if (result.action === 'removed') {
        this.server.to(`channel:${channelId}`).emit('reaction:removed', {
          channelId,
          messageId,
          emoji: reaction.emoji,
          user: {
            id: user.id,
            username: user.username,
          },
        });
      } else {
        this.server.to(`channel:${channelId}`).emit('reaction:added', {
          channelId,
          messageId,
          emoji: reaction.emoji,
          user: {
            id: user.id,
            username: user.username,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error adding reaction: ${error.message}`);
      client.emit('error', {
        event: 'reaction:add',
        message: error.message || 'Không thể thêm reaction',
      });
    }
  }

  /**
   * Remove reaction from message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('reaction:remove')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { channelId: string; messageId: string; emoji: string },
  ) {
    const { channelId, messageId, emoji } = data;
    const user = client.user;

    try {
      await this.chatService.removeReaction(
        user.id,
        channelId,
        messageId,
        emoji,
      );

      // Broadcast removal to channel
      this.server.to(`channel:${channelId}`).emit('reaction:removed', {
        channelId,
        messageId,
        emoji,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    } catch (error) {
      this.logger.error(`Error removing reaction: ${error.message}`);
      client.emit('error', {
        event: 'reaction:remove',
        message: error.message || 'Không thể xóa reaction',
      });
    }
  }

  /**
   * Typing indicator - start
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const user = client.user;

    // Broadcast to channel (except sender)
    client.to(`channel:${channelId}`).emit('typing:start', {
      channelId,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
    });
  }

  /**
   * Typing indicator - stop
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const user = client.user;

    // Broadcast to channel (except sender)
    client.to(`channel:${channelId}`).emit('typing:stop', {
      channelId,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  }

  /**
   * Mark messages as read
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('messages:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const user = client.user;

    try {
      await this.chatService.markAsRead(user.id, channelId);

      // Optionally broadcast read receipt
      this.server.to(`channel:${channelId}`).emit('messages:read', {
        channelId,
        user: {
          id: user.id,
          username: user.username,
        },
        readAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error marking as read: ${error.message}`);
    }
  }

  /**
   * Get online users in channel
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('users:online')
  handleGetOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const onlineUsers = this.getOnlineUsersInChannel(channelId);

    client.emit('users:online:list', {
      channelId,
      onlineUsers,
    });
  }

  // ============ Helper Methods ============

  private async isChannelMember(
    userId: string,
    channelId: string,
  ): Promise<boolean> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!channel) return false;

    if (channel.members.length > 0) return true;

    // Check workspace admin
    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId,
        },
      },
      include: { role: true },
    });

    return workspaceMember?.role.name === 'WORKSPACE_ADMIN';
  }

  private addUserToChannel(
    user: AuthenticatedSocket['user'],
    channelId: string,
    socketId: string,
  ) {
    if (!this.channelUsers.has(channelId)) {
      this.channelUsers.set(channelId, new Map());
    }

    const channelUserMap = this.channelUsers.get(channelId)!;

    if (!channelUserMap.has(user.id)) {
      channelUserMap.set(user.id, {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        socketIds: new Set(),
      });
    }

    channelUserMap.get(user.id)!.socketIds.add(socketId);
  }

  private removeUserFromChannel(
    userId: string,
    channelId: string,
    socketId: string,
  ) {
    const channelUserMap = this.channelUsers.get(channelId);
    if (!channelUserMap) return;

    const userInfo = channelUserMap.get(userId);
    if (!userInfo) return;

    userInfo.socketIds.delete(socketId);

    // If user has no more sockets in this channel, remove them
    if (userInfo.socketIds.size === 0) {
      channelUserMap.delete(userId);
    }

    // If channel has no users, remove channel from map
    if (channelUserMap.size === 0) {
      this.channelUsers.delete(channelId);
    }
  }

  private getOnlineUsersInChannel(
    channelId: string,
  ): Array<{ id: string; username: string; fullName: string }> {
    const channelUserMap = this.channelUsers.get(channelId);
    if (!channelUserMap) return [];

    return Array.from(channelUserMap.values()).map((user) => ({
      id: user.userId,
      username: user.username,
      fullName: user.fullName,
    }));
  }

  /**
   * Public method to emit events from other services
   */
  emitToChannel(channelId: string, event: string, data: any) {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }

  /**
   * Public method to emit to specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  // ============ DIRECT MESSAGING EVENTS ============

  /**
   * Join a direct conversation room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:join')
  async handleJoinDirectConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const user = client.user;

    try {
      // Verify user is participant of conversation
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: true,
        },
      });

      if (!conversation) {
        client.emit('error', { message: 'Conversation không tồn tại' });
        return;
      }

      if (conversation.type !== 'DIRECT') {
        client.emit('error', { message: 'Không phải direct conversation' });
        return;
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId === user.id,
      );
      if (!isParticipant) {
        client.emit('error', {
          message: 'Bạn không phải thành viên của conversation này',
        });
        return;
      }

      // Join Socket.IO room
      client.join(`dm:${conversationId}`);

      // Get other participant
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== user.id,
      );

      // Check if other participant is online
      const otherParticipantOnline = otherParticipant
        ? this.userSockets.has(otherParticipant.userId)
        : false;

      client.emit('dm:joined', {
        conversationId,
        otherParticipantOnline,
      });

      // Notify other participant that user is now in the conversation
      if (otherParticipant) {
        this.emitToUser(otherParticipant.userId, 'dm:user:online', {
          conversationId,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
          },
        });
      }

      this.logger.log(
        `User ${user.username} joined DM conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Error joining DM conversation: ${error.message}`);
      client.emit('error', { message: 'Không thể tham gia conversation' });
    }
  }

  /**
   * Leave a direct conversation room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:leave')
  async handleLeaveDirectConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const user = client.user;

    // Leave Socket.IO room
    client.leave(`dm:${conversationId}`);

    // Get other participant to notify
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (conversation) {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== user.id,
      );
      if (otherParticipant) {
        this.emitToUser(otherParticipant.userId, 'dm:user:offline', {
          conversationId,
          user: {
            id: user.id,
            username: user.username,
          },
        });
      }
    }

    client.emit('dm:left', { conversationId });
    this.logger.log(
      `User ${user.username} left DM conversation ${conversationId}`,
    );
  }

  /**
   * Send a direct message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:message:send')
  async handleSendDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: Omit<SendDirectMessageDto, 'workspaceId'> & { workspaceId: string },
  ) {
    const user = client.user;

    try {
      // Use ChatService to create message
      const newMessage = await this.chatService.sendDirectMessage(user.id, {
        workspaceId: data.workspaceId,
        conversationId: data.conversationId,
        recipientId: data.recipientId,
        content: data.content,
        replyToId: data.replyToId,
        attachmentUrls: data.attachmentUrls,
      });

      // Get conversation to find other participant
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: newMessage.conversationId },
        include: {
          participants: true,
        },
      });

      if (conversation) {
        // Broadcast to conversation room
        this.server
          .to(`dm:${newMessage.conversationId}`)
          .emit('dm:message:new', {
            conversationId: newMessage.conversationId,
            message: newMessage,
          });

        // Also emit directly to recipient (in case they're not in the room yet)
        const recipient = conversation.participants.find(
          (p) => p.userId !== user.id,
        );
        if (recipient) {
          // Emit message notification
          this.emitToUser(recipient.userId, 'dm:message:notification', {
            conversationId: newMessage.conversationId,
            message: newMessage,
          });

          // Also notify recipient to refresh conversation list
          // so new conversation appears in their sidebar
          this.emitToUser(recipient.userId, 'dm:conversation:updated', {
            conversationId: newMessage.conversationId,
            workspaceId: data.workspaceId,
          });

          this.logger.log(
            `Emitted dm:conversation:updated to ${recipient.userId} for workspace ${data.workspaceId}`,
          );
        }
      }

      // Send confirmation to sender
      client.emit('dm:message:sent', {
        conversationId: newMessage.conversationId,
        message: newMessage,
      });

      this.logger.log(`Direct message sent by ${user.username}`);
    } catch (error) {
      this.logger.error(`Error sending direct message: ${error.message}`);
      client.emit('error', {
        event: 'dm:message:send',
        message: error.message || 'Không thể gửi tin nhắn',
      });
    }
  }

  /**
   * Delete a direct message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:message:delete')
  async handleDeleteDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { workspaceId: string; conversationId: string; messageId: string },
  ) {
    const { workspaceId, conversationId, messageId } = data;
    const user = client.user;

    try {
      await this.chatService.deleteDirectMessage(
        user.id,
        workspaceId,
        conversationId,
        messageId,
      );

      // Broadcast deletion to conversation
      this.server.to(`dm:${conversationId}`).emit('dm:message:deleted', {
        conversationId,
        messageId,
        deletedBy: {
          id: user.id,
          username: user.username,
        },
      });

      client.emit('dm:message:delete:success', { conversationId, messageId });
    } catch (error) {
      this.logger.error(`Error deleting direct message: ${error.message}`);
      client.emit('error', {
        event: 'dm:message:delete',
        message: error.message || 'Không thể xóa tin nhắn',
      });
    }
  }

  /**
   * Add reaction to direct message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:reaction:add')
  async handleAddDirectReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      workspaceId: string;
      conversationId: string;
      messageId: string;
      reaction: AddReactionDto;
    },
  ) {
    const { workspaceId, conversationId, messageId, reaction } = data;
    const user = client.user;

    try {
      const result = await this.chatService.addDirectReaction(
        user.id,
        workspaceId,
        conversationId,
        messageId,
        reaction,
      );

      // Broadcast reaction to conversation based on action
      if (result.action === 'removed') {
        this.server.to(`dm:${conversationId}`).emit('dm:reaction:removed', {
          conversationId,
          messageId,
          emoji: reaction.emoji,
          user: {
            id: user.id,
            username: user.username,
          },
        });
      } else {
        this.server.to(`dm:${conversationId}`).emit('dm:reaction:added', {
          conversationId,
          messageId,
          emoji: reaction.emoji,
          user: {
            id: user.id,
            username: user.username,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error adding direct reaction: ${error.message}`);
      client.emit('error', {
        event: 'dm:reaction:add',
        message: error.message || 'Không thể thêm reaction',
      });
    }
  }

  /**
   * Remove reaction from direct message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:reaction:remove')
  async handleRemoveDirectReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      workspaceId: string;
      conversationId: string;
      messageId: string;
      emoji: string;
    },
  ) {
    const { workspaceId, conversationId, messageId, emoji } = data;
    const user = client.user;

    try {
      await this.chatService.removeDirectReaction(
        user.id,
        workspaceId,
        conversationId,
        messageId,
        emoji,
      );

      // Broadcast removal to conversation
      this.server.to(`dm:${conversationId}`).emit('dm:reaction:removed', {
        conversationId,
        messageId,
        emoji,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    } catch (error) {
      this.logger.error(`Error removing direct reaction: ${error.message}`);
      client.emit('error', {
        event: 'dm:reaction:remove',
        message: error.message || 'Không thể xóa reaction',
      });
    }
  }

  /**
   * Typing indicator for direct message - start
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:typing:start')
  handleDirectTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const user = client.user;

    // Broadcast to conversation (except sender)
    client.to(`dm:${conversationId}`).emit('dm:typing:start', {
      conversationId,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
    });
  }

  /**
   * Typing indicator for direct message - stop
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:typing:stop')
  handleDirectTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const user = client.user;

    // Broadcast to conversation (except sender)
    client.to(`dm:${conversationId}`).emit('dm:typing:stop', {
      conversationId,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  }

  /**
   * Mark direct messages as read
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('dm:messages:read')
  async handleMarkDirectAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string; conversationId: string },
  ) {
    const { workspaceId, conversationId } = data;
    const user = client.user;

    try {
      await this.chatService.markDirectConversationAsRead(
        user.id,
        workspaceId,
        conversationId,
      );

      // Broadcast read receipt to conversation
      this.server.to(`dm:${conversationId}`).emit('dm:messages:read', {
        conversationId,
        user: {
          id: user.id,
          username: user.username,
        },
        readAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error marking direct messages as read: ${error.message}`,
      );
    }
  }
}
