import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dtos/create-post.dto';
import {
  PostResponseDto,
  PostDetailResponseDto,
  PostListItemDto,
  PostAuthorDto,
  CommentPreviewDto,
} from './dtos/post-response.dto';
import { ROLES } from '../common/constants/roles.constant';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  /**
   * Kiểm tra xem user có phải là member của channel không
   * User có quyền nếu:
   * 1. Là CHANNEL_MEMBER hoặc CHANNEL_ADMIN của channel đó, HOẶC
   * 2. Là WORKSPACE_ADMIN của workspace chứa channel đó
   */
  private async isChannelMember(
    userId: string,
    channelId: string,
  ): Promise<boolean> {
    // Lấy thông tin channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!channel) return false;

    // Check 1: User là member của channel
    if (channel.members.length > 0) {
      return true;
    }

    // Check 2: User là WORKSPACE_ADMIN của workspace này
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
   * Helper: Map user to PostAuthorDto
   */
  private mapUserToAuthorDto(user: any): PostAuthorDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? undefined,
    };
  }

  /**
   * Tạo bài đăng trong channel
   * Chỉ Channel Member hoặc Channel Admin
   */
  async create(
    userId: string,
    channelId: string,
    dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra user có quyền post trong channel không
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để tạo bài đăng',
      );
    }

    // 3. Tạo post với reactable trong transaction
    const post = await this.prisma.$transaction(async (tx) => {
      // Tạo reactable trước
      const reactable = await tx.reactable.create({
        data: {
          type: 'POST',
        },
      });

      // Tạo post
      const newPost = await tx.post.create({
        data: {
          channelId,
          authorId: userId,
          content: dto.content,
          reactableId: reactable.id,
        },
        include: {
          author: true,
        },
      });

      return newPost;
    });

    return {
      id: post.id,
      channelId: post.channelId,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: this.mapUserToAuthorDto(post.author),
    };
  }

  /**
   * Lấy danh sách bài đăng trong channel
   * Chỉ Channel Member, Channel Admin, hoặc Workspace Admin
   */
  async findAllByChannel(
    userId: string,
    channelId: string,
  ): Promise<PostListItemDto[]> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền xem posts
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để xem bài đăng',
      );
    }

    // 3. Lấy danh sách posts
    const posts = await this.prisma.post.findMany({
      where: {
        channelId,
        isDeleted: false,
      },
      include: {
        author: true,
        comments: {
          where: {
            isDeleted: false,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts.map((post) => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      author: this.mapUserToAuthorDto(post.author),
      commentCount: post.comments.length,
    }));
  }

  /**
   * Xem chi tiết bài đăng với 1-3 preview comments
   * Chỉ Channel Member, Channel Admin, hoặc Workspace Admin
   */
  async findOne(
    userId: string,
    channelId: string,
    postId: string,
  ): Promise<PostDetailResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền xem posts
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để xem bài đăng',
      );
    }

    // 3. Tìm post
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        comments: {
          where: {
            isDeleted: false,
          },
          include: {
            author: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 3, // Lấy tối đa 3 comments
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    if (post.isDeleted) {
      throw new NotFoundException('Bài đăng đã bị xóa');
    }

    // Kiểm tra post có thuộc channel này không
    if (post.channelId !== channelId) {
      throw new BadRequestException('Bài đăng không thuộc channel này');
    }

    // 4. Đếm tổng số comments
    const totalComments = await this.prisma.comment.count({
      where: {
        postId: post.id,
        isDeleted: false,
      },
    });

    // 5. Map preview comments
    const previewComments: CommentPreviewDto[] = post.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: this.mapUserToAuthorDto(comment.author),
    }));

    return {
      id: post.id,
      channelId: post.channelId,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: this.mapUserToAuthorDto(post.author),
      previewComments,
      totalComments,
    };
  }
}

