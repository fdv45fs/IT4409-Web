import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
import { ROLES } from '../common/constants/roles.constant';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

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
        content: message.replyTo.isDeleted ? undefined : message.replyTo.content ?? undefined,
        sender: this.mapUserToSenderDto(message.replyTo.sender),
        isDeleted: message.replyTo.isDeleted,
      };
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.isDeleted ? undefined : message.content ?? undefined,
      sender: this.mapUserToSenderDto(message.sender),
      replyTo,
      mentions: this.mapMentions(message.mentions || []),
      reactions: this.mapReactions(message.reactable?.reactions || []),
      attachments: this.mapAttachments(message.reactable?.fileAttachments || []),
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
      const existingParticipant = await this.prisma.conversationParticipant.findUnique({
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const isChannelAdmin = channelMembership?.role.name === ROLES.CHANNEL_ADMIN;

      if (!isChannelAdmin) {
        // Kiểm tra Workspace Admin
        const workspaceMembership = await this.prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: channel.workspaceId,
              userId,
            },
          },
          include: { role: true },
        });

        const isWorkspaceAdmin = workspaceMembership?.role.name === ROLES.WORKSPACE_ADMIN;

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
   * Thêm reaction vào tin nhắn
   */
  async addReaction(
    userId: string,
    channelId: string,
    messageId: string,
    dto: AddReactionDto,
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

    // 4. Kiểm tra đã reaction chưa
    const existingReaction = await this.prisma.reaction.findUnique({
      where: {
        reactableId_userId_emoji: {
          reactableId: message.reactableId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existingReaction) {
      throw new BadRequestException('Bạn đã reaction emoji này rồi');
    }

    // 5. Tạo reaction
    await this.prisma.reaction.create({
      data: {
        reactableId: message.reactableId,
        userId,
        emoji: dto.emoji,
      },
    });

    return {
      message: 'Đã thêm reaction thành công',
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

    // 3. Tìm và xóa reaction
    const reaction = await this.prisma.reaction.findUnique({
      where: {
        reactableId_userId_emoji: {
          reactableId: message.reactableId,
          userId,
          emoji,
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Không tìm thấy reaction');
    }

    await this.prisma.reaction.delete({
      where: { id: reaction.id },
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
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel',
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
}

