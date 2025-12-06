import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto } from './dtos/create-post.dto';
import {
  PostResponseDto,
  PostDetailResponseDto,
  PostListItemDto,
} from './dtos/post-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('posts')
@Controller('channels/:channelId/posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostController {
  constructor(private readonly postService: PostService) {}

  /**
   * POST /api/channels/:channelId/posts
   * Tạo bài đăng trong channel
   * Chỉ Channel Member hoặc Channel Admin
   */
  @Post()
  @ApiOperation({
    summary: 'Tạo bài đăng trong channel',
    description: 'Chỉ Channel Member hoặc Channel Admin mới có quyền tạo bài đăng',
  })
  @ApiResponse({
    status: 201,
    description: 'Bài đăng được tạo thành công',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền tạo bài đăng (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel không tồn tại',
  })
  async create(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostResponseDto> {
    const userId = req.user.id;
    return this.postService.create(userId, channelId, createPostDto);
  }

  /**
   * GET /api/channels/:channelId/posts
   * Lấy danh sách bài đăng trong channel
   * Chỉ Channel Member, Channel Admin, hoặc Workspace Admin
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách bài đăng trong channel',
    description:
      'Chỉ Channel Member, Channel Admin, hoặc Workspace Admin mới có quyền xem danh sách bài đăng',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách bài đăng',
    type: [PostListItemDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel không tồn tại',
  })
  async findAll(
    @Req() req: any,
    @Param('channelId') channelId: string,
  ): Promise<PostListItemDto[]> {
    const userId = req.user.id;
    return this.postService.findAllByChannel(userId, channelId);
  }

  /**
   * GET /api/channels/:channelId/posts/:postId
   * Xem chi tiết bài đăng với 1-3 preview comments
   * Chỉ Channel Member, Channel Admin, hoặc Workspace Admin
   */
  @Get(':postId')
  @ApiOperation({
    summary: 'Xem chi tiết bài đăng',
    description:
      'Chi tiết bài đăng, kèm 1-3 preview comments. Chỉ Channel Member, Channel Admin, hoặc Workspace Admin mới có quyền xem.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết bài đăng với preview comments',
    type: PostDetailResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem (không phải member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Channel hoặc bài đăng không tồn tại',
  })
  async findOne(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Param('postId') postId: string,
  ): Promise<PostDetailResponseDto> {
    const userId = req.user.id;
    return this.postService.findOne(userId, channelId, postId);
  }
}

