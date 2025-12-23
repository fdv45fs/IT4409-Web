import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dtos/create-message.dto';
import { AddReactionDto } from './dtos/add-reaction.dto';
import { GetMessagesQueryDto } from './dtos/get-messages-query.dto';
import {
  MessageResponseDto,
  MessageListResponseDto,
  ConversationResponseDto,
} from './dtos/message-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('chat')
@Controller('channels/:channelId/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * GET /api/channels/:channelId/chat/conversation
   * Lấy hoặc tạo conversation cho channel
   */
  @Get('conversation')
  @ApiOperation({
    summary: 'Lấy hoặc tạo conversation cho channel',
    description: 'Trả về conversation hiện có hoặc tạo mới nếu chưa có. Chỉ member của channel mới có quyền truy cập.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiResponse({
    status: 200,
    description: 'Conversation của channel',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel không tồn tại',
  })
  async getOrCreateConversation(
    @Req() req: any,
    @Param('channelId') channelId: string,
  ): Promise<ConversationResponseDto> {
    const userId = req.user.id;
    return this.chatService.getOrCreateChannelConversation(userId, channelId);
  }

  /**
   * POST /api/channels/:channelId/chat/messages
   * Gửi tin nhắn trong channel
   */
  @Post('messages')
  @ApiOperation({
    summary: 'Gửi tin nhắn trong channel',
    description: 'Gửi tin nhắn mới vào channel. Hỗ trợ reply, mention và đính kèm file.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiResponse({
    status: 201,
    description: 'Tin nhắn được gửi thành công',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gửi tin nhắn (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel hoặc tin nhắn reply không tồn tại',
  })
  async sendMessage(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const userId = req.user.id;
    return this.chatService.sendMessage(userId, channelId, createMessageDto);
  }

  /**
   * GET /api/channels/:channelId/chat/messages
   * Lấy danh sách tin nhắn trong channel
   */
  @Get('messages')
  @ApiOperation({
    summary: 'Lấy danh sách tin nhắn trong channel',
    description: 'Lấy tin nhắn với pagination (offset hoặc cursor-based). Tin nhắn được sắp xếp theo thời gian (cũ nhất trước).',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang (mặc định 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số tin nhắn mỗi trang (mặc định 50, tối đa 100)' })
  @ApiQuery({ name: 'beforeId', required: false, description: 'Cursor: lấy tin nhắn trước messageId này' })
  @ApiQuery({ name: 'afterId', required: false, description: 'Cursor: lấy tin nhắn sau messageId này' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tin nhắn',
    type: MessageListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem tin nhắn (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel không tồn tại',
  })
  async getMessages(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Query() query: GetMessagesQueryDto,
  ): Promise<MessageListResponseDto> {
    const userId = req.user.id;
    return this.chatService.getMessages(userId, channelId, query);
  }

  /**
   * GET /api/channels/:channelId/chat/messages/:messageId
   * Lấy chi tiết một tin nhắn
   */
  @Get('messages/:messageId')
  @ApiOperation({
    summary: 'Lấy chi tiết tin nhắn',
    description: 'Lấy thông tin chi tiết của một tin nhắn bao gồm reactions, mentions, attachments.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết tin nhắn',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem tin nhắn (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel hoặc tin nhắn không tồn tại',
  })
  async getMessageById(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ): Promise<MessageResponseDto> {
    const userId = req.user.id;
    return this.chatService.getMessageById(userId, channelId, messageId);
  }

  /**
   * DELETE /api/channels/:channelId/chat/messages/:messageId
   * Xóa tin nhắn
   */
  @Delete('messages/:messageId')
  @ApiOperation({
    summary: 'Xóa tin nhắn',
    description: 'Xóa tin nhắn (soft delete). Chỉ người gửi, Channel Admin hoặc Workspace Admin mới có quyền xóa.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn cần xóa' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tin nhắn thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xóa tin nhắn',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel hoặc tin nhắn không tồn tại',
  })
  async deleteMessage(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.chatService.deleteMessage(userId, channelId, messageId);
  }

  /**
   * POST /api/channels/:channelId/chat/messages/:messageId/reactions
   * Thêm reaction vào tin nhắn
   */
  @Post('messages/:messageId/reactions')
  @ApiOperation({
    summary: 'Thêm reaction vào tin nhắn',
    description: 'Thêm emoji reaction vào tin nhắn. Mỗi user chỉ được reaction 1 lần với mỗi emoji.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn' })
  @ApiResponse({
    status: 201,
    description: 'Thêm reaction thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Đã reaction emoji này rồi hoặc tin nhắn đã bị xóa',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền reaction (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel hoặc tin nhắn không tồn tại',
  })
  async addReaction(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Body() addReactionDto: AddReactionDto,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.chatService.addReaction(userId, channelId, messageId, addReactionDto);
  }

  /**
   * DELETE /api/channels/:channelId/chat/messages/:messageId/reactions/:emoji
   * Xóa reaction khỏi tin nhắn
   */
  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({
    summary: 'Xóa reaction khỏi tin nhắn',
    description: 'Xóa emoji reaction của user khỏi tin nhắn.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn' })
  @ApiParam({ name: 'emoji', description: 'Emoji cần xóa (URL encoded)' })
  @ApiResponse({
    status: 200,
    description: 'Xóa reaction thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy reaction',
  })
  async removeReaction(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    // Decode emoji from URL (e.g., %F0%9F%91%8D -> 👍)
    const decodedEmoji = decodeURIComponent(emoji);
    return this.chatService.removeReaction(userId, channelId, messageId, decodedEmoji);
  }

  /**
   * POST /api/channels/:channelId/chat/mark-read
   * Đánh dấu đã đọc tất cả tin nhắn trong channel
   */
  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu đã đọc tin nhắn',
    description: 'Đánh dấu đã đọc tất cả tin nhắn trong channel.',
  })
  @ApiParam({ name: 'channelId', description: 'ID của channel' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu đã đọc thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel không tồn tại',
  })
  async markAsRead(
    @Req() req: any,
    @Param('channelId') channelId: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.chatService.markAsRead(userId, channelId);
  }
}

