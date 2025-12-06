import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import {
  CommentResponseDto,
  CommentAuthorDto,
} from './dtos/comment-response.dto';
import { ROLES } from '../common/constants/roles.constant';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Kiểm tra xem user có phải là member của channel không
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

    // Check 1: User là member của channel
    if (channel.members.length > 0) {
      return true;
    }

    // Check 2: User là WORKSPACE_ADMIN
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
   * Helper: Map user to CommentAuthorDto
   */
  private mapUserToAuthorDto(user: any): CommentAuthorDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? undefined,
    };
  }

  /**
   * Tạo comment cho bài đăng
   * Chỉ Channel Member hoặc Channel Admin
   */
  async create(
    userId: string,
    channelId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra post tồn tại và thuộc channel
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    if (post.isDeleted) {
      throw new BadRequestException('Không thể bình luận bài đăng đã bị xóa');
    }

    if (post.channelId !== channelId) {
      throw new BadRequestException('Bài đăng không thuộc channel này');
    }

    // 3. Kiểm tra user có quyền comment không
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để bình luận',
      );
    }

    // 4. Tạo comment với reactable trong transaction
    const comment = await this.prisma.$transaction(async (tx) => {
      // Tạo reactable trước
      const reactable = await tx.reactable.create({
        data: {
          type: 'COMMENT',
        },
      });

      // Tạo comment
      const newComment = await tx.comment.create({
        data: {
          postId,
          authorId: userId,
          content: dto.content,
          reactableId: reactable.id,
        },
        include: {
          author: true,
        },
      });

      return newComment;
    });

    return {
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: this.mapUserToAuthorDto(comment.author),
    };
  }

  /**
   * Lấy tất cả comments của bài đăng
   * Chỉ Channel Member, Channel Admin, hoặc Workspace Admin
   */
  async findAllByPost(
    userId: string,
    channelId: string,
    postId: string,
  ): Promise<CommentResponseDto[]> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra post tồn tại và thuộc channel
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    if (post.isDeleted) {
      throw new NotFoundException('Bài đăng đã bị xóa');
    }

    if (post.channelId !== channelId) {
      throw new BadRequestException('Bài đăng không thuộc channel này');
    }

    // 3. Kiểm tra quyền xem comments
    const isMember = await this.isChannelMember(userId, channelId);

    if (!isMember) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để xem bình luận',
      );
    }

    // 4. Lấy tất cả comments
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        isDeleted: false,
      },
      include: {
        author: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: this.mapUserToAuthorDto(comment.author),
    }));
  }

  /**
   * Xóa comment (soft delete)
   * Chỉ người tạo comment mới có quyền xóa
   */
  async remove(
    userId: string,
    channelId: string,
    postId: string,
    commentId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra post tồn tại và thuộc channel
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    if (post.channelId !== channelId) {
      throw new BadRequestException('Bài đăng không thuộc channel này');
    }

    // 3. Tìm comment
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Bình luận không tồn tại');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Bình luận đã bị xóa');
    }

    if (comment.postId !== postId) {
      throw new BadRequestException('Bình luận không thuộc bài đăng này');
    }

    // 4. Kiểm tra quyền xóa (chỉ người tạo comment)
    if (comment.authorId !== userId) {
      throw new ForbiddenException(
        'Bạn chỉ có thể xóa bình luận của chính mình',
      );
    }

    // 5. Soft delete comment
    await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Đã xóa bình luận thành công',
    };
  }
}

