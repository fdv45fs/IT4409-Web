import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageSenderDto {
  @ApiProperty({ description: 'ID người gửi' })
  id: string;

  @ApiProperty({ description: 'Email người gửi' })
  email: string;

  @ApiProperty({ description: 'Username người gửi' })
  username: string;

  @ApiProperty({ description: 'Tên đầy đủ người gửi' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Avatar URL người gửi' })
  avatarUrl?: string;
}

export class MentionedUserDto {
  @ApiProperty({ description: 'ID người được mention' })
  id: string;

  @ApiProperty({ description: 'Username người được mention' })
  username: string;

  @ApiProperty({ description: 'Tên đầy đủ người được mention' })
  fullName: string;
}

export class ReactionDto {
  @ApiProperty({ description: 'Emoji reaction' })
  emoji: string;

  @ApiProperty({ description: 'Số lượng người reaction' })
  count: number;

  @ApiProperty({
    description: 'Danh sách user IDs đã reaction',
    type: [String],
  })
  userIds: string[];
}

export class AttachmentDto {
  @ApiProperty({ description: 'ID attachment' })
  id: string;

  @ApiProperty({ description: 'URL file đính kèm' })
  fileUrl: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  createdAt: Date;
}

export class ReplyToMessageDto {
  @ApiProperty({ description: 'ID tin nhắn gốc' })
  id: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn gốc (có thể bị xóa)' })
  content?: string;

  @ApiProperty({ description: 'Người gửi tin nhắn gốc' })
  sender: MessageSenderDto;

  @ApiProperty({ description: 'Tin nhắn gốc đã bị xóa?' })
  isDeleted: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'ID tin nhắn' })
  id: string;

  @ApiProperty({ description: 'ID conversation' })
  conversationId: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn' })
  content?: string;

  @ApiProperty({ description: 'Thông tin người gửi' })
  sender: MessageSenderDto;

  @ApiPropertyOptional({ description: 'Tin nhắn đang reply' })
  replyTo?: ReplyToMessageDto;

  @ApiProperty({ description: 'Danh sách người được mention', type: [MentionedUserDto] })
  mentions: MentionedUserDto[];

  @ApiProperty({ description: 'Danh sách reactions', type: [ReactionDto] })
  reactions: ReactionDto[];

  @ApiProperty({ description: 'Danh sách file đính kèm', type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty({ description: 'Tin nhắn đã bị xóa?' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Thời gian tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Thời gian cập nhật' })
  updatedAt: Date;
}

export class MessageListResponseDto {
  @ApiProperty({ description: 'Danh sách tin nhắn', type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiProperty({ description: 'Tổng số tin nhắn' })
  total: number;

  @ApiProperty({ description: 'Trang hiện tại' })
  page: number;

  @ApiProperty({ description: 'Số tin nhắn mỗi trang' })
  limit: number;

  @ApiProperty({ description: 'Còn tin nhắn tiếp theo?' })
  hasMore: boolean;
}

export class ConversationResponseDto {
  @ApiProperty({ description: 'ID conversation' })
  id: string;

  @ApiProperty({ description: 'Loại conversation' })
  type: string;

  @ApiPropertyOptional({ description: 'ID channel (nếu là channel chat)' })
  channelId?: string;

  @ApiProperty({ description: 'Thời gian tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Thời gian cập nhật' })
  updatedAt: Date;
}

