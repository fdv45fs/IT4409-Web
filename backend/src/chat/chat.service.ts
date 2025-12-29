import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dtos/create-message.dto';
import { AddReactionDto } from './dtos/add-reaction.dto';
import { GetMessagesQueryDto } from './dtos/get-messages-query.dto';
import {
  MessageResponseDto,
  MessageListResponseDto,
  ConversationResponseDto,
  MessageSenderDto,
  MentionedUserDto,
  ReactionDto,
  AttachmentDto,
  ReplyToMessageDto,
} from './dtos/message-response.dto';
import {
  DirectConversationListResponseDto,
  DirectConversationItemDto,
  DirectConversationParticipantDto,
  LastMessageDto,
  CreateDirectConversationDto,
} from './dtos/direct-conversation-response.dto';
import { SendDirectMessageDto } from './dtos/send-direct-message.dto';
import { ROLES } from '../common/constants/roles.constant';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) { }

  /**
   * Kiểm tra user có phải là member của channel không
   */
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

    // User là member của channel
    if (channel.members.length > 0) {
      return true;
    }

    // User là WORKSPACE_ADMIN
    const workspaceMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId,
        },
      },
      include: { role: true },
    });

    if (workspaceMembership?.role.name === ROLES.WORKSPACE_ADMIN) {
      return true;
    }

    return false;
  }

  /**
   * Map user to MessageSenderDto
   */
  private mapUserToSenderDto(user: any): MessageSenderDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? undefined,
    };
  }

  /**
   * Map mentions to MentionedUserDto[]
   */
  private mapMentions(mentions: any[]): MentionedUserDto[] {
    return mentions.map((m) => ({
      id: m.mentionedUser.id,
      username: m.mentionedUser.username,
      fullName: m.mentionedUser.fullName,
    }));
  }

  /**
   * Map reactions grouped by emoji
   */
  private mapReactions(reactions: any[]): ReactionDto[] {
    const reactionMap = new Map<string, { count: number; userIds: string[] }>();

    reactions.forEach((r) => {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, { count: 0, userIds: [] });
      }
      const entry = reactionMap.get(r.emoji)!;
      entry.count++;
      entry.userIds.push(r.userId);
    });

    return Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userIds: data.userIds,
    }));
  }

  /**
   * Map attachments
   */
  private mapAttachments(attachments: any[]): AttachmentDto[] {
    return attachments.map((a) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Map message to MessageResponseDto
   */
  private mapMessageToDto(message: any): MessageResponseDto {
    let replyTo: ReplyToMessageDto | undefined;

    if (message.replyTo) {
      replyTo = {
        id: message.replyTo.id,
        content: message.replyTo.isDeleted
          ? undefined
          : (message.replyTo.content ?? undefined),
        sender: this.mapUserToSenderDto(message.replyTo.sender),
        isDeleted: message.replyTo.isDeleted,
      };
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.isDeleted ? undefined : (message.content ?? undefined),
      sender: this.mapUserToSenderDto(message.sender),
      replyTo,
      mentions: this.mapMentions(message.mentions || []),
      reactions: this.mapReactions(message.reactable?.reactions || []),
      attachments: this.mapAttachments(
        message.reactable?.fileAttachments || [],
      ),
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Lấy hoặc tạo conversation cho channel
   */
  async getOrCreateChannelConversation(
    userId: string,
    channelId: string,
  ): Promise<ConversationResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền truy cập
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để truy cập chat',
      );
    }

    // 3. Tìm conversation hiện có hoặc tạo mới
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        channelId,
        type: 'CHANNEL',
      },
    });

    if (!conversation) {
      // Tạo conversation mới cho channel
      conversation = await this.prisma.$transaction(async (tx) => {
        const newConversation = await tx.conversation.create({
          data: {
            type: 'CHANNEL',
            channelId,
          },
        });

        // Thêm user hiện tại làm participant
        await tx.conversationParticipant.create({
          data: {
            conversationId: newConversation.id,
            userId,
          },
        });

        return newConversation;
      });
    } else {
      // Kiểm tra và thêm user vào conversation nếu chưa có
      const existingParticipant =
        await this.prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId,
            },
          },
        });

      if (!existingParticipant) {
        await this.prisma.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            userId,
          },
        });
      }
    }

    return {
      id: conversation.id,
      type: conversation.type,
      channelId: conversation.channelId ?? undefined,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Gửi tin nhắn trong channel
   */
  async sendMessage(
    userId: string,
    channelId: string,
    dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền gửi tin nhắn
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để gửi tin nhắn',
      );
    }

    // 3. Kiểm tra replyToId nếu có
    if (dto.replyToId) {
      const replyToMessage = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
        include: {
          conversation: true,
        },
      });

      if (!replyToMessage) {
        throw new NotFoundException('Tin nhắn reply không tồn tại');
      }

      if (replyToMessage.conversation.channelId !== channelId) {
        throw new BadRequestException('Tin nhắn reply không thuộc channel này');
      }
    }

    // 4. Validate mentioned users (phải là member của channel)
    if (dto.mentionedUserIds && dto.mentionedUserIds.length > 0) {
      const channelMembers = await this.prisma.channelMember.findMany({
        where: {
          channelId,
          userId: { in: dto.mentionedUserIds },
        },
      });

      const validMemberIds = channelMembers.map((m) => m.userId);
      const invalidUserIds = dto.mentionedUserIds.filter(
        (id) => !validMemberIds.includes(id),
      );

      if (invalidUserIds.length > 0) {
        throw new BadRequestException(
          'Một số user được mention không phải thành viên của channel',
        );
      }
    }

    // 5. Lấy hoặc tạo conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        channelId,
        type: 'CHANNEL',
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: 'CHANNEL',
          channelId,
        },
      });
    }

    // 6. Tạo tin nhắn với transaction
    const message = await this.prisma.$transaction(async (tx) => {
      // Tạo reactable
      const reactable = await tx.reactable.create({
        data: {
          type: 'MESSAGE',
        },
      });

      // Tạo tin nhắn
      const newMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: dto.content,
          replyToId: dto.replyToId ?? null,
          reactableId: reactable.id,
        },
      });

      // Tạo mentions
      if (dto.mentionedUserIds && dto.mentionedUserIds.length > 0) {
        await tx.messageMention.createMany({
          data: dto.mentionedUserIds.map((mentionedUserId) => ({
            messageId: newMessage.id,
            mentionedUserId,
          })),
        });
      }

      // Tạo file attachments
      if (dto.attachmentUrls && dto.attachmentUrls.length > 0) {
        await tx.fileAttachment.createMany({
          data: dto.attachmentUrls.map((fileUrl) => ({
            reactableId: reactable.id,
            fileUrl,
          })),
        });
      }

      // Cập nhật lastReadAt cho participant
      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId,
          },
        },
        update: {
          lastReadAt: new Date(),
        },
        create: {
          conversationId: conversation.id,
          userId,
          lastReadAt: new Date(),
        },
      });

      return newMessage;
    });

    // 7. Lấy tin nhắn đầy đủ để trả về
    const fullMessage = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
    });

    return this.mapMessageToDto(fullMessage);
  }

  /**
   * Lấy danh sách tin nhắn trong channel với pagination
   */
  async getMessages(
    userId: string,
    channelId: string,
    query: GetMessagesQueryDto,
  ): Promise<MessageListResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền xem tin nhắn
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để xem tin nhắn',
      );
    }

    // 3. Tìm conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        channelId,
        type: 'CHANNEL',
      },
    });

    if (!conversation) {
      return {
        messages: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
        hasMore: false,
      };
    }

    // 4. Build query conditions
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      conversationId: conversation.id,
    };

    // Cursor-based pagination
    if (query.beforeId) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: query.beforeId },
      });
      if (beforeMessage) {
        whereCondition.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    if (query.afterId) {
      const afterMessage = await this.prisma.message.findUnique({
        where: { id: query.afterId },
      });
      if (afterMessage) {
        whereCondition.createdAt = { gt: afterMessage.createdAt };
      }
    }

    // 5. Đếm tổng số tin nhắn
    const total = await this.prisma.message.count({
      where: { conversationId: conversation.id },
    });

    // 6. Lấy tin nhắn
    const messages = await this.prisma.message.findMany({
      where: whereCondition,
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: query.beforeId || query.afterId ? 0 : skip,
      take: limit,
    });

    // 7. Cập nhật lastReadAt
    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        conversationId: conversation.id,
        userId,
        lastReadAt: new Date(),
      },
    });

    // 8. Reverse để hiển thị tin nhắn cũ trước
    const sortedMessages = messages.reverse();

    return {
      messages: sortedMessages.map((m) => this.mapMessageToDto(m)),
      total,
      page,
      limit,
      hasMore: skip + messages.length < total,
    };
  }

  /**
   * Xóa tin nhắn (soft delete)
   */
  async deleteMessage(
    userId: string,
    channelId: string,
    messageId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversation.channelId !== channelId) {
      throw new BadRequestException('Tin nhắn không thuộc channel này');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Tin nhắn đã bị xóa');
    }

    // 3. Kiểm tra quyền xóa
    // Chỉ người gửi hoặc Channel Admin mới được xóa
    const isOwner = message.senderId === userId;

    if (!isOwner) {
      // Kiểm tra có phải Channel Admin không
      const channelMembership = await this.prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId,
            userId,
          },
        },
        include: { role: true },
      });

      const isChannelAdmin =
        channelMembership?.role.name === ROLES.CHANNEL_ADMIN;

      if (!isChannelAdmin) {
        // Kiểm tra Workspace Admin
        const workspaceMembership =
          await this.prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId: channel.workspaceId,
                userId,
              },
            },
            include: { role: true },
          });

        const isWorkspaceAdmin =
          workspaceMembership?.role.name === ROLES.WORKSPACE_ADMIN;

        if (!isWorkspaceAdmin) {
          throw new ForbiddenException(
            'Bạn chỉ có thể xóa tin nhắn của chính mình',
          );
        }
      }
    }

    // 4. Soft delete tin nhắn
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    return {
      message: 'Đã xóa tin nhắn thành công',
    };
  }

  /**
   * Toggle reaction vào tin nhắn
   * Mỗi user chỉ có thể react 1 emoji - khi react emoji khác sẽ thay thế emoji cũ
   */
  async addReaction(
    userId: string,
    channelId: string,
    messageId: string,
    dto: AddReactionDto,
  ): Promise<{
    message: string;
    action: 'added' | 'removed' | 'replaced';
    removedEmojis?: string[];
  }> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để reaction',
      );
    }

    // 3. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
        reactable: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversation.channelId !== channelId) {
      throw new BadRequestException('Tin nhắn không thuộc channel này');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Không thể reaction tin nhắn đã xóa');
    }

    // 4. Enforce: mỗi user chỉ có 1 reaction trên 1 message
    const existingReactions = await this.prisma.reaction.findMany({
      where: {
        reactableId: message.reactableId,
        userId,
      },
    });

    const existingEmojis = Array.from(
      new Set(existingReactions.map((r) => r.emoji)),
    );

    const hasSameEmoji = existingEmojis.includes(dto.emoji);

    // 5. Toggle behavior
    if (hasSameEmoji) {
      // Un-react: idempotent delete (handles duplicates)
      await this.prisma.reaction.deleteMany({
        where: {
          reactableId: message.reactableId,
          userId,
          emoji: dto.emoji,
        },
      });

      return {
        message: 'Đã xóa reaction thành công',
        action: 'removed',
      };
    }

    // React new emoji: remove all existing reactions (if any), then add new
    const removedEmojis = existingEmojis;
    const action: 'added' | 'replaced' = removedEmojis.length > 0 ? 'replaced' : 'added';

    if (removedEmojis.length > 0) {
      await this.prisma.reaction.deleteMany({
        where: {
          reactableId: message.reactableId,
          userId,
        },
      });
    }

    await this.prisma.reaction.create({
      data: {
        reactableId: message.reactableId,
        userId,
        emoji: dto.emoji,
      },
    });

    return {
      message:
        action === 'replaced' ? 'Đã thay thế reaction' : 'Đã thêm reaction thành công',
      action,
      removedEmojis: action === 'replaced' ? removedEmojis : [],
    };
  }

  /**
   * Xóa reaction khỏi tin nhắn
   */
  async removeReaction(
    userId: string,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversation.channelId !== channelId) {
      throw new BadRequestException('Tin nhắn không thuộc channel này');
    }

    // 3. Xóa reaction theo kiểu idempotent (không throw nếu đã bị xóa trước đó)
    await this.prisma.reaction.deleteMany({
      where: {
        reactableId: message.reactableId,
        userId,
        emoji,
      },
    });

    return {
      message: 'Đã xóa reaction thành công',
    };
  }

  /**
   * Lấy chi tiết một tin nhắn
   */
  async getMessageById(
    userId: string,
    channelId: string,
    messageId: string,
  ): Promise<MessageResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để xem tin nhắn',
      );
    }

    // 3. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversation.channelId !== channelId) {
      throw new BadRequestException('Tin nhắn không thuộc channel này');
    }

    return this.mapMessageToDto(message);
  }

  /**
   * Đánh dấu đã đọc tin nhắn trong channel
   */
  async markAsRead(
    userId: string,
    channelId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException('Bạn phải là thành viên của channel');
    }

    // 3. Tìm conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        channelId,
        type: 'CHANNEL',
      },
    });

    if (!conversation) {
      return {
        message: 'Không có tin nhắn nào để đánh dấu',
      };
    }

    // 4. Cập nhật lastReadAt
    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        conversationId: conversation.id,
        userId,
        lastReadAt: new Date(),
      },
    });

    return {
      message: 'Đã đánh dấu đọc tất cả tin nhắn',
    };
  }

  // ======================== DIRECT MESSAGING ========================

  /**
   * Kiểm tra 2 user có cùng workspace không
   */
  private async areUsersInSameWorkspace(
    userId1: string,
    userId2: string,
    workspaceId: string,
  ): Promise<boolean> {
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { in: [userId1, userId2] },
      },
    });

    return members.length === 2;
  }

  /**
   * Lấy hoặc tạo direct conversation giữa 2 users trong workspace
   */
  async getOrCreateDirectConversation(
    userId: string,
    dto: CreateDirectConversationDto,
  ): Promise<ConversationResponseDto> {
    const { workspaceId, otherUserId } = dto;

    // 1. Validate: Không thể chat với chính mình
    if (userId === otherUserId) {
      throw new BadRequestException('Không thể chat với chính mình');
    }

    // 2. Kiểm tra cả 2 user đều là member của workspace
    const inSameWorkspace = await this.areUsersInSameWorkspace(
      userId,
      otherUserId,
      workspaceId,
    );

    if (!inSameWorkspace) {
      throw new ForbiddenException(
        'Cả hai user phải là thành viên của workspace',
      );
    }

    // 3. Tìm conversation đã tồn tại (ensure workspaceId is set)
    const conversations = await this.prisma.conversation.findMany({
      where: {
        workspaceId: workspaceId, // Must match exactly, not null
        type: 'DIRECT',
        channelId: null,
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    const existingConversation = conversations.find(
      (c) =>
        c.participants.length === 2 &&
        c.participants.every((p) => [userId, otherUserId].includes(p.userId)),
    );

    if (existingConversation) {
      return {
        id: existingConversation.id,
        type: existingConversation.type,
        workspaceId: existingConversation.workspaceId ?? workspaceId,
        channelId: undefined,
        createdAt: existingConversation.createdAt,
        updatedAt: existingConversation.updatedAt,
      };
    }

    // 4. Tạo conversation mới
    const newConversation = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          type: 'DIRECT',
          workspaceId,
          channelId: null,
        },
      });

      // Thêm cả 2 users vào conversation
      await tx.conversationParticipant.createMany({
        data: [
          {
            conversationId: conv.id,
            userId,
          },
          {
            conversationId: conv.id,
            userId: otherUserId,
          },
        ],
      });

      return conv;
    });

    return {
      id: newConversation.id,
      type: newConversation.type,
      channelId: undefined,
      createdAt: newConversation.createdAt,
      updatedAt: newConversation.updatedAt,
    };
  }

  /**
   * Lấy danh sách direct conversations của user trong workspace
   */
  async getDirectConversations(
    userId: string,
    workspaceId: string,
  ): Promise<DirectConversationListResponseDto> {
    // 1. Kiểm tra user là member của workspace
    const workspaceMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!workspaceMembership) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của workspace này',
      );
    }

    // 2. Lấy tất cả conversations mà user tham gia (type = DIRECT)
    const participations = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
        conversation: {
          workspaceId,
          type: 'DIRECT',
          channelId: null,
        },
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: true,
              },
            },
            messages: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              include: {
                sender: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    });

    // 3. Fetch all unread messages in a single query
    const conversationIds = participations.map((p) => p.conversation.id);

    // Early return if no conversations
    if (conversationIds.length === 0) {
      return {
        conversations: [],
        total: 0,
      };
    }

    const allUnreadMessages = await this.prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isDeleted: false,
      },
      select: {
        id: true,
        conversationId: true,
        createdAt: true,
      },
    });

    // Create a map of participation info for quick lookup
    const participationMap = new Map<string, { lastReadAt: Date }>(
      participations.map((p) => [
        p.conversation.id,
        { lastReadAt: p.lastReadAt ?? new Date(0) },
      ]),
    );

    // Count unread messages for each conversation
    const unreadCountMap = new Map<string, number>();
    for (const message of allUnreadMessages) {
      const participation = participationMap.get(message.conversationId);
      if (participation && message.createdAt > participation.lastReadAt) {
        const currentCount = unreadCountMap.get(message.conversationId) ?? 0;
        unreadCountMap.set(message.conversationId, currentCount + 1);
      }
    }

    // Fetch presence for other participants to set initial online status
    const otherUserIds = participations
      .map(
        (p) =>
          p.conversation.participants.find((pp) => pp.userId !== userId)
            ?.userId,
      )
      .filter((id): id is string => Boolean(id));

    const uniqueOtherUserIds = Array.from(new Set(otherUserIds));
    const onlinePresences = await this.prisma.userPresence.findMany({
      where: {
        userId: { in: uniqueOtherUserIds },
        status: 'online',
      },
      select: { userId: true },
    });
    const onlineSet = new Set(onlinePresences.map((p) => p.userId));

    const filteredConversations: DirectConversationItemDto[] = [];

    for (const participation of participations) {
      const conv = participation.conversation;

      // Tìm other participant (không phải current user)
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== userId,
      );

      if (!otherParticipant) continue;

      // Get unread count from map
      const unreadCount = unreadCountMap.get(conv.id) ?? 0;

      // Map last message
      let lastMessage: LastMessageDto | undefined;
      if (conv.messages.length > 0) {
        const msg = conv.messages[0];
        lastMessage = {
          id: msg.id,
          content: msg.isDeleted ? undefined : (msg.content ?? undefined),
          senderId: msg.senderId,
          senderName: msg.sender.fullName,
          isDeleted: msg.isDeleted,
          createdAt: msg.createdAt,
        };
      }

      // Map other participant
      const otherUser = otherParticipant.user;
      const otherParticipantDto: DirectConversationParticipantDto = {
        id: otherUser.id,
        username: otherUser.username,
        fullName: otherUser.fullName,
        email: otherUser.email,
        avatarUrl: otherUser.avatarUrl ?? undefined,
        isOnline: onlineSet.has(otherUser.id),
      };

      filteredConversations.push({
        id: conv.id,
        otherParticipant: otherParticipantDto,
        lastMessage,
        unreadCount,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      });
    }

    return {
      conversations: filteredConversations,
      total: filteredConversations.length,
    };
  }

  /**
   * Gửi tin nhắn trong direct conversation
   */
  async sendDirectMessage(
    userId: string,
    dto: SendDirectMessageDto,
  ): Promise<MessageResponseDto> {
    const {
      workspaceId,
      conversationId,
      recipientId,
      content,
      replyToId,
      attachmentUrls,
    } = dto;

    // 1. Validate: Không thể gửi tin cho chính mình
    if (userId === recipientId) {
      throw new BadRequestException('Không thể gửi tin nhắn cho chính mình');
    }

    // 2. Kiểm tra cả 2 user đều là member của workspace
    const inSameWorkspace = await this.areUsersInSameWorkspace(
      userId,
      recipientId,
      workspaceId,
    );

    if (!inSameWorkspace) {
      throw new ForbiddenException(
        'Cả hai user phải là thành viên của workspace',
      );
    }

    // 3. Lấy hoặc tạo conversation
    let conversation: any | null;
    if (conversationId) {
      // Kiểm tra conversation tồn tại và user có quyền
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: true,
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation không tồn tại');
      }

      // Ensure conversation belongs to this workspace
      if (conversation.workspaceId !== workspaceId) {
        throw new ForbiddenException('Conversation không thuộc workspace này');
      }

      if (conversation.type !== 'DIRECT') {
        throw new BadRequestException('Conversation không phải loại DIRECT');
      }

      const participantIds = conversation.participants.map((p) => p.userId);
      if (!participantIds.includes(userId)) {
        throw new ForbiddenException(
          'Bạn không phải thành viên của conversation này',
        );
      }
    } else {
      // Tạo mới conversation
      const convResult = await this.getOrCreateDirectConversation(userId, {
        workspaceId,
        otherUserId: recipientId,
      });
      conversation = await this.prisma.conversation.findUnique({
        where: { id: convResult.id },
        include: {
          participants: true,
        },
      });
    }

    // Đảm bảo conversation không null
    if (!conversation) {
      throw new NotFoundException('Không thể tạo hoặc tìm thấy conversation');
    }

    // 4. Kiểm tra replyToId nếu có
    if (replyToId) {
      const replyToMessage = await this.prisma.message.findUnique({
        where: { id: replyToId },
      });

      if (
        !replyToMessage ||
        replyToMessage.conversationId !== conversation.id
      ) {
        throw new BadRequestException('Tin nhắn reply không hợp lệ');
      }
    }

    // 5. Tạo tin nhắn với transaction
    const message = await this.prisma.$transaction(async (tx) => {
      // Tạo reactable
      const reactable = await tx.reactable.create({
        data: {
          type: 'MESSAGE',
        },
      });

      // Tạo tin nhắn
      const newMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: content ?? null,
          replyToId: replyToId ?? null,
          reactableId: reactable.id,
        },
      });

      // Tạo file attachments
      if (attachmentUrls && attachmentUrls.length > 0) {
        await tx.fileAttachment.createMany({
          data: attachmentUrls.map((fileUrl) => ({
            reactableId: reactable.id,
            fileUrl,
          })),
        });
      }

      // Cập nhật lastReadAt cho sender
      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId,
          },
        },
        update: {
          lastReadAt: new Date(),
        },
        create: {
          conversationId: conversation.id,
          userId,
          lastReadAt: new Date(),
        },
      });

      // Cập nhật conversation.updatedAt
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
        },
      });

      return newMessage;
    });

    // 6. Lấy tin nhắn đầy đủ để trả về
    const fullMessage = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
    });

    return this.mapMessageToDto(fullMessage);
  }

  /**
   * Lấy tin nhắn trong direct conversation với pagination
   */
  async getDirectMessages(
    userId: string,
    workspaceId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ): Promise<MessageListResponseDto> {
    // 1. Kiểm tra conversation tồn tại
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Ensure conversation belongs to this workspace
    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    if (conversation.type !== 'DIRECT') {
      throw new BadRequestException('Conversation không phải loại DIRECT');
    }

    // 2. Kiểm tra user có quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // 3. Build query conditions
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      conversationId: conversation.id,
    };

    // Cursor-based pagination
    if (query.beforeId) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: query.beforeId },
      });
      if (beforeMessage) {
        whereCondition.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    if (query.afterId) {
      const afterMessage = await this.prisma.message.findUnique({
        where: { id: query.afterId },
      });
      if (afterMessage) {
        whereCondition.createdAt = { gt: afterMessage.createdAt };
      }
    }

    // 4. Đếm tổng số tin nhắn
    const total = await this.prisma.message.count({
      where: { conversationId: conversation.id },
    });

    // 5. Lấy tin nhắn
    const messages = await this.prisma.message.findMany({
      where: whereCondition,
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: query.beforeId || query.afterId ? 0 : skip,
      take: limit,
    });

    // 6. Cập nhật lastReadAt
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // 7. Reverse để hiển thị tin nhắn cũ trước
    const sortedMessages = messages.reverse();

    return {
      messages: sortedMessages.map((m) => this.mapMessageToDto(m)),
      total,
      page,
      limit,
      hasMore: skip + messages.length < total,
    };
  }

  /**
   * Lấy chi tiết một tin nhắn trong direct conversation
   */
  async getDirectMessageById(
    userId: string,
    workspaceId: string,
    conversationId: string,
    messageId: string,
  ): Promise<MessageResponseDto> {
    // 1. Kiểm tra conversation tồn tại
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Ensure conversation belongs to this workspace
    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    // 2. Kiểm tra quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // 3. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    // 4. Kiểm tra tin nhắn thuộc conversation này
    if (message.conversationId !== conversationId) {
      throw new ForbiddenException('Tin nhắn không thuộc conversation này');
    }

    return this.mapMessageToDto(message);
  }

  /**
   * Đánh dấu đã đọc tin nhắn trong direct conversation
   */
  async markDirectConversationAsRead(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra conversation tồn tại
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Ensure conversation belongs to this workspace
    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    if (conversation.type !== 'DIRECT') {
      throw new BadRequestException('Conversation không phải loại DIRECT');
    }

    // 2. Kiểm tra user có quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // 3. Cập nhật lastReadAt
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return {
      message: 'Đã đánh dấu đọc tất cả tin nhắn',
    };
  }

  /**
   * Xóa tin nhắn trong direct conversation
   */
  async deleteDirectMessage(
    userId: string,
    workspaceId: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra conversation tồn tại
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Ensure conversation belongs to this workspace
    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    if (conversation.type !== 'DIRECT') {
      throw new BadRequestException('Conversation không phải loại DIRECT');
    }

    // 2. Kiểm tra user có quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // 3. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversationId !== conversationId) {
      throw new BadRequestException('Tin nhắn không thuộc conversation này');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Tin nhắn đã bị xóa');
    }

    // 4. Kiểm tra quyền xóa (chỉ người gửi mới được xóa trong DM)
    if (message.senderId !== userId) {
      throw new ForbiddenException(
        'Bạn chỉ có thể xóa tin nhắn của chính mình',
      );
    }

    // 5. Soft delete tin nhắn
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    return {
      message: 'Đã xóa tin nhắn thành công',
    };
  }

  /**
   * Toggle reaction vào tin nhắn trong direct conversation
   * Mỗi user chỉ có thể react 1 emoji - khi react emoji khác sẽ thay thế emoji cũ
   */
  async addDirectReaction(
    userId: string,
    workspaceId: string,
    conversationId: string,
    messageId: string,
    dto: AddReactionDto,
  ): Promise<{
    message: string;
    action: 'added' | 'removed' | 'replaced';
    removedEmojis?: string[];
  }> {
    // 1. Kiểm tra conversation tồn tại
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Ensure conversation belongs to this workspace
    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    if (conversation.type !== 'DIRECT') {
      throw new BadRequestException('Conversation không phải loại DIRECT');
    }

    // 2. Kiểm tra user có quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // 3. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactable: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversationId !== conversationId) {
      throw new BadRequestException('Tin nhắn không thuộc conversation này');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Không thể reaction tin nhắn đã xóa');
    }

    // 4. Enforce: mỗi user chỉ có 1 reaction trên 1 message
    const existingReactions = await this.prisma.reaction.findMany({
      where: {
        reactableId: message.reactableId,
        userId,
      },
    });

    const existingEmojis = Array.from(
      new Set(existingReactions.map((r) => r.emoji)),
    );
    const hasSameEmoji = existingEmojis.includes(dto.emoji);

    // 5. Toggle reaction
    if (hasSameEmoji) {
      await this.prisma.reaction.deleteMany({
        where: {
          reactableId: message.reactableId,
          userId,
          emoji: dto.emoji,
        },
      });

      return {
        message: 'Đã xóa reaction thành công',
        action: 'removed',
      };
    }

    const removedEmojis = existingEmojis;
    const action: 'added' | 'replaced' = removedEmojis.length > 0 ? 'replaced' : 'added';

    if (removedEmojis.length > 0) {
      await this.prisma.reaction.deleteMany({
        where: {
          reactableId: message.reactableId,
          userId,
        },
      });
    }

    await this.prisma.reaction.create({
      data: {
        reactableId: message.reactableId,
        userId,
        emoji: dto.emoji,
      },
    });

    return {
      message:
        action === 'replaced' ? 'Đã thay thế reaction' : 'Đã thêm reaction thành công',
      action,
      removedEmojis: action === 'replaced' ? removedEmojis : [],
    };
  }

  /**
   * Xóa reaction khỏi tin nhắn trong direct conversation
   */
  async removeDirectReaction(
    userId: string,
    workspaceId: string,
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra conversation tồn tại
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Ensure conversation belongs to this workspace
    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    if (conversation.type !== 'DIRECT') {
      throw new BadRequestException('Conversation không phải loại DIRECT');
    }

    // 2. Kiểm tra user có quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // 3. Tìm tin nhắn
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.conversationId !== conversationId) {
      throw new BadRequestException('Tin nhắn không thuộc conversation này');
    }

    // 4. Xóa reaction theo kiểu idempotent (không throw nếu đã bị xóa trước đó)
    await this.prisma.reaction.deleteMany({
      where: {
        reactableId: message.reactableId,
        userId,
        emoji,
      },
    });

    return {
      message: 'Đã xóa reaction thành công',
    };
  }

  /**
   * Tìm kiếm tin nhắn trong channel
   */
  async searchChannelMessages(
    userId: string,
    channelId: string,
    keyword: string,
  ) {
    // Kiểm tra quyền
    const isMember = await this.isChannelMember(userId, channelId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không phải thành viên của channel này');
    }

    // Tìm conversation của channel
    const conversation = await this.prisma.conversation.findFirst({
      where: { channelId, type: 'CHANNEL' },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Tìm tin nhắn chứa keyword
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        content: {
          contains: keyword,
        },
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
        reactable: {
          include: {
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
            fileAttachments: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Giới hạn kết quả
    });

    return messages.map((msg) => this.mapMessageToDto(msg));
  }

  /**
   * Tìm kiếm tin nhắn trong direct conversation
   */
  async searchDirectMessages(
    userId: string,
    workspaceId: string,
    conversationId: string,
    keyword: string,
  ) {
    // Kiểm tra conversation tồn tại và thuộc workspace
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    if (conversation.workspaceId !== workspaceId) {
      throw new ForbiddenException('Conversation không thuộc workspace này');
    }

    if (conversation.type !== 'DIRECT') {
      throw new BadRequestException('Conversation không phải loại DIRECT');
    }

    // Kiểm tra user có quyền
    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của conversation này',
      );
    }

    // Tìm tin nhắn chứa keyword
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        content: {
          contains: keyword,
        },
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
        reactable: {
          include: {
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
            fileAttachments: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return messages.map((msg) => this.mapMessageToDto(msg));
  }

  /**
   * Thêm attachments vào tin nhắn đã tồn tại
   */
  async addAttachments(messageId: string, fileUrls: string[]): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    await this.prisma.fileAttachment.createMany({
      data: fileUrls.map((url) => ({
        reactableId: message.reactableId,
        fileUrl: url,
      })),
    });

    // Return updated message with attachments
    const fullMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
        reactable: {
          include: {
            reactions: true,
            fileAttachments: true,
          },
        },
      },
    });

    return this.mapMessageToDto(fullMessage);
  }

  /**
   * Authorize and return attachment URL for download/preview.
   */
  async getAttachmentUrlForUser(userId: string, attachmentId: string): Promise<string> {
    const attachment = await this.prisma.fileAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        reactable: {
          include: {
            messages: {
              include: {
                conversation: {
                  include: {
                    participants: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('File attachment không tồn tại');
    }

    const message = attachment.reactable?.messages?.[0];
    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn của attachment');
    }

    const conversation = message.conversation;
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy conversation của attachment');
    }

    // Channel conversation: require channel membership
    if (conversation.channelId) {
      const isMember = await this.isChannelMember(userId, conversation.channelId);
      if (!isMember) {
        throw new ForbiddenException('Bạn không có quyền tải file này');
      }

      return attachment.fileUrl;
    }

    // Direct conversation: require participant
    const participantIds = (conversation.participants || []).map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException('Bạn không có quyền tải file này');
    }

    return attachment.fileUrl;
  }
}
