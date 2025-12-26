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
import { AddReactionDto } from './dtos/add-reaction.dto';
import { GetMessagesQueryDto } from './dtos/get-messages-query.dto';
import {
  MessageResponseDto,
  MessageListResponseDto,
  ConversationResponseDto,
} from './dtos/message-response.dto';
import {
  DirectConversationListResponseDto,
  CreateDirectConversationDto,
} from './dtos/direct-conversation-response.dto';
import { SendDirectMessageDto } from './dtos/send-direct-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('direct-chat')
@Controller('workspaces/:workspaceId/direct-messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DirectChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * GET /api/workspaces/:workspaceId/direct-messages
   * Lấy danh sách conversations trong workspace
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách direct conversations',
    description:
      'Lấy tất cả các cuộc trò chuyện 1-1 của user trong workspace, được sắp xếp theo tin nhắn mới nhất.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách conversations',
    type: DirectConversationListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (không phải member của workspace)',
  })
  async getDirectConversations(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
  ): Promise<DirectConversationListResponseDto> {
    const userId = req.user.id;
    return this.chatService.getDirectConversations(userId, workspaceId);
  }

  /**
   * POST /api/workspaces/:workspaceId/direct-messages/conversations
   * Tạo hoặc lấy conversation với user khác
   */
  @Post('conversations')
  @ApiOperation({
    summary: 'Tạo hoặc lấy direct conversation',
    description:
      'Tạo conversation mới hoặc trả về conversation đã tồn tại giữa 2 users trong workspace.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiResponse({
    status: 201,
    description: 'Conversation được tạo hoặc đã tồn tại',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (không thể chat với chính mình)',
  })
  @ApiResponse({
    status: 403,
    description: 'Cả 2 user phải là member của workspace',
  })
  async createOrGetConversation(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: Omit<CreateDirectConversationDto, 'workspaceId'>,
  ): Promise<ConversationResponseDto> {
    const userId = req.user.id;
    return this.chatService.getOrCreateDirectConversation(userId, {
      workspaceId,
      otherUserId: dto.otherUserId,
    });
  }

  /**
   * POST /api/workspaces/:workspaceId/direct-messages/send
   * Gửi tin nhắn trực tiếp
   */
  @Post('send')
  @ApiOperation({
    summary: 'Gửi tin nhắn direct',
    description:
      'Gửi tin nhắn trực tiếp cho user khác trong workspace. Tự động tạo conversation nếu chưa có.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
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
    description: 'Cả 2 user phải là member của workspace',
  })
  async sendDirectMessage(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: Omit<SendDirectMessageDto, 'workspaceId'>,
  ): Promise<MessageResponseDto> {
    const userId = req.user.id;
    return this.chatService.sendDirectMessage(userId, {
      workspaceId,
      ...dto,
    });
  }

  /**
   * GET /api/workspaces/:workspaceId/direct-messages/conversations/:conversationId/messages
   * Lấy tin nhắn trong conversation
   */
  @Get('conversations/:conversationId/messages')
  @ApiOperation({
    summary: 'Lấy tin nhắn trong direct conversation',
    description:
      'Lấy danh sách tin nhắn với pagination. Tự động đánh dấu đã đọc khi lấy tin nhắn.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiParam({ name: 'conversationId', description: 'ID của conversation' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Số trang (mặc định 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số tin nhắn mỗi trang (mặc định 50, tối đa 100)',
  })
  @ApiQuery({
    name: 'beforeId',
    required: false,
    description: 'Cursor: lấy tin nhắn trước messageId này',
  })
  @ApiQuery({
    name: 'afterId',
    required: false,
    description: 'Cursor: lấy tin nhắn sau messageId này',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tin nhắn',
    type: MessageListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (không phải participant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation không tồn tại',
  })
  async getDirectMessages(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesQueryDto,
  ): Promise<MessageListResponseDto> {
    const userId = req.user.id;
    return this.chatService.getDirectMessages(
      userId,
      workspaceId,
      conversationId,
      query,
    );
  }

  /**
   * GET /api/workspaces/:workspaceId/direct-messages/conversations/:conversationId/messages/:messageId
   * Lấy chi tiết một tin nhắn
   */
  @Get('conversations/:conversationId/messages/:messageId')
  @ApiOperation({
    summary: 'Lấy chi tiết tin nhắn trong direct conversation',
    description:
      'Lấy thông tin chi tiết của một tin nhắn bao gồm reactions, mentions, attachments.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiParam({ name: 'conversationId', description: 'ID của conversation' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết tin nhắn',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem tin nhắn (không phải participant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation hoặc tin nhắn không tồn tại',
  })
  async getDirectMessageById(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ): Promise<MessageResponseDto> {
    const userId = req.user.id;
    return this.chatService.getDirectMessageById(
      userId,
      workspaceId,
      conversationId,
      messageId,
    );
  }

  /**
   * DELETE /api/workspaces/:workspaceId/direct-messages/conversations/:conversationId/messages/:messageId
   * Xóa tin nhắn
   */
  @Delete('conversations/:conversationId/messages/:messageId')
  @ApiOperation({
    summary: 'Xóa tin nhắn trong direct conversation',
    description:
      'Xóa tin nhắn của mình (soft delete). Chỉ người gửi mới có quyền xóa.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiParam({ name: 'conversationId', description: 'ID của conversation' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn cần xóa' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tin nhắn thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xóa (chỉ người gửi mới được xóa)',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation hoặc tin nhắn không tồn tại',
  })
  async deleteDirectMessage(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ): Promise<any> {
    const userId = req.user.id;
    return this.chatService.deleteDirectMessage(
      userId,
      workspaceId,
      conversationId,
      messageId,
    );
  }

  /**
   * POST /api/workspaces/:workspaceId/direct-messages/conversations/:conversationId/messages/:messageId/reactions
   * Thêm reaction vào tin nhắn
   */
  @Post('conversations/:conversationId/messages/:messageId/reactions')
  @ApiOperation({
    summary: 'Toggle reaction vào tin nhắn direct',
    description:
      'Toggle emoji reaction vào tin nhắn. Nếu user đã reaction với emoji này thì sẽ xóa reaction. Nếu chưa reaction thì sẽ thêm reaction mới. Response trả về "action" field để biết reaction đã được added hay removed.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiParam({ name: 'conversationId', description: 'ID của conversation' })
  @ApiParam({ name: 'messageId', description: 'ID của tin nhắn' })
  @ApiResponse({
    status: 201,
    description:
      'Toggle reaction thành công. Response chứa field "action" với giá trị "added" hoặc "removed"',
  })
  @ApiResponse({
    status: 400,
    description: 'Tin nhắn đã bị xóa',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (không phải participant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation hoặc tin nhắn không tồn tại',
  })
  async addReaction(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() addReactionDto: AddReactionDto,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.chatService.addDirectReaction(
      userId,
      workspaceId,
      conversationId,
      messageId,
      addReactionDto,
    );
  }

  /**
   * DELETE /api/workspaces/:workspaceId/direct-messages/conversations/:conversationId/messages/:messageId/reactions/:emoji
   * Xóa reaction khỏi tin nhắn
   */
  @Delete('conversations/:conversationId/messages/:messageId/reactions/:emoji')
  @ApiOperation({
    summary: 'Xóa reaction khỏi tin nhắn direct',
    description: 'Xóa emoji reaction của user khỏi tin nhắn.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiParam({ name: 'conversationId', description: 'ID của conversation' })
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
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    const decodedEmoji = decodeURIComponent(emoji);
    return this.chatService.removeDirectReaction(
      userId,
      workspaceId,
      conversationId,
      messageId,
      decodedEmoji,
    );
  }

  /**
   * POST /api/workspaces/:workspaceId/direct-messages/conversations/:conversationId/mark-read
   * Đánh dấu đã đọc
   */
  @Post('conversations/:conversationId/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu đã đọc tin nhắn',
    description: 'Đánh dấu đã đọc tất cả tin nhắn trong conversation.',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID của workspace' })
  @ApiParam({ name: 'conversationId', description: 'ID của conversation' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu đã đọc thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (không phải participant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation không tồn tại',
  })
  async markAsRead(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return this.chatService.markDirectConversationAsRead(
      userId,
      workspaceId,
      conversationId,
    );
  }
}
