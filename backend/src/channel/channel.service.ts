import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dtos/create-channel.dto';
import { UpdateChannelDto } from './dtos/update-channel.dto';
import { AddChannelMemberDto } from './dtos/add-member.dto';
import {
  ChannelResponseDto,
  ChannelListItemDto,
} from './dtos/channel-response.dto';
import { ChannelMemberResponseDto } from './dtos/channel-member-response.dto';
import { ROLES } from '../common/constants/roles.constant';
import { randomBytes } from 'crypto';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  private generateJoinCode(): string {
    return randomBytes(4).toString('hex');
  }

  /**
   * Tạo Channel mới
   * Chỉ Workspace Admin hoặc Privilege Member mới có quyền
   */
  async create(
    userId: string,
    dto: CreateChannelDto,
  ): Promise<ChannelResponseDto> {
    // 1. Kiểm tra user có quyền trong workspace không
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: dto.workspaceId,
          userId,
        },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Bạn không thuộc workspace này');
    }

    // 2. Kiểm tra role có quyền tạo channel không
    const allowedRoles = [
      ROLES.WORKSPACE_ADMIN,
      ROLES.WORKSPACE_PRIVILEGE_MEMBER,
    ];
    if (!allowedRoles.includes(membership.role.name as ROLES)) {
      throw new ForbiddenException(
        'Chỉ Workspace Admin hoặc Privilege Member mới có quyền tạo channel',
      );
    }

    // 3. Kiểm tra workspace có tồn tại không
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: dto.workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace không tồn tại');
    }

    // 4. Tạo channel
    const joinCode = dto.isPrivate ? this.generateJoinCode() : null;

    const channel = await this.prisma.channel.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        workspaceId: dto.workspaceId,
        isPrivate: dto.isPrivate ?? false,
        joinCode,
      },
    });

    // 5. Tự động thêm người tạo làm CHANNEL_ADMIN
    const channelAdminRole = await this.prisma.role.findUnique({
      where: { name: ROLES.CHANNEL_ADMIN },
    });

    if (!channelAdminRole) {
      throw new NotFoundException('Role CHANNEL_ADMIN not found');
    }

    await this.prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId,
        roleId: channelAdminRole.id,
      },
    });

    // 6. Đếm số member
    const memberCount = await this.prisma.channelMember.count({
      where: { channelId: channel.id },
    });

    return {
      id: channel.id,
      workspaceId: channel.workspaceId,
      name: channel.name,
      description: channel.description ?? undefined,
      isPrivate: channel.isPrivate,
      joinCode: channel.joinCode ?? undefined,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      myRole: ROLES.CHANNEL_ADMIN,
      memberCount,
    };
  }

  /**
   * Lấy danh sách channel mà user tham gia
   * Query parameter: workspaceId (optional) để filter theo workspace
   */
  async findAllByUser(
    userId: string,
    workspaceId?: string,
  ): Promise<ChannelListItemDto[]> {
    // Tìm tất cả channel mà user là member
    const memberships = await this.prisma.channelMember.findMany({
      where: {
        userId,
        ...(workspaceId && {
          channel: {
            workspaceId,
          },
        }),
      },
      include: {
        channel: {
          include: {
            members: true,
          },
        },
        role: true,
      },
    });

    return memberships.map((m) => ({
      id: m.channel.id,
      name: m.channel.name,
      description: m.channel.description ?? undefined,
      isPrivate: m.channel.isPrivate,
      memberCount: m.channel.members.length,
      myRole: m.role.name,
    }));
  }

  /**
   * Xem chi tiết Channel
   * Chỉ Channel Member hoặc Channel Admin mới xem được
   */
  async findOne(userId: string, channelId: string): Promise<ChannelResponseDto> {
    // 1. Tìm channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { role: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra user có phải member của channel không
    const membership = channel.members.find((m) => m.userId === userId);

    if (!membership) {
      throw new ForbiddenException('Bạn không có quyền xem channel này');
    }

    // 3. Trả về thông tin chi tiết
    return {
      id: channel.id,
      workspaceId: channel.workspaceId,
      name: channel.name,
      description: channel.description ?? undefined,
      isPrivate: channel.isPrivate,
      joinCode: channel.joinCode ?? undefined,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      myRole: membership.role.name,
      memberCount: channel.members.length,
    };
  }

  /**
   * Cập nhật Channel
   * Chỉ Channel Admin mới có quyền
   */
  async update(
    userId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    // 1. Tìm channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { role: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra user có phải Channel Admin không
    const membership = channel.members.find((m) => m.userId === userId);

    if (!membership) {
      throw new ForbiddenException('Bạn không thuộc channel này');
    }

    if (membership.role.name !== ROLES.CHANNEL_ADMIN) {
      throw new ForbiddenException('Chỉ Channel Admin mới có quyền cập nhật');
    }

    // 3. Cập nhật channel (atomic update to prevent race condition)
    const updatedChannel = await this.prisma.$transaction(async (tx) => {
      // Read current channel state inside transaction
      const currentChannel = await tx.channel.findUnique({
        where: { id: channelId },
        include: { members: true },
      });

      if (!currentChannel) {
        throw new NotFoundException('Channel không tồn tại');
      }

      // Determine joinCode update logic based on current state
      let joinCodeUpdate: string | null | undefined = undefined;
      
      if (dto.isPrivate !== undefined) {
        if (!currentChannel.isPrivate && dto.isPrivate) {
          // Changing from public to private: always generate new joinCode
          joinCodeUpdate = this.generateJoinCode();
        } else if (currentChannel.isPrivate && !dto.isPrivate) {
          // Changing from private to public: always remove joinCode
          joinCodeUpdate = null;
        }
        // If privacy not changing, leave joinCode unchanged
      }

      // Perform atomic update
      const updated = await tx.channel.update({
        where: { id: channelId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
          ...(joinCodeUpdate !== undefined && { joinCode: joinCodeUpdate }),
        },
        include: {
          members: true,
        },
      });

      return updated;
    });

    // 4. Trả về thông tin đã cập nhật
    return {
      id: updatedChannel.id,
      workspaceId: updatedChannel.workspaceId,
      name: updatedChannel.name,
      description: updatedChannel.description ?? undefined,
      isPrivate: updatedChannel.isPrivate,
      joinCode: updatedChannel.joinCode ?? undefined,
      createdAt: updatedChannel.createdAt,
      updatedAt: updatedChannel.updatedAt,
      myRole: ROLES.CHANNEL_ADMIN,
      memberCount: updatedChannel.members.length,
    };
  }

  /**
   * Xóa Channel
   * Chỉ Channel Admin mới có quyền
   */
  async remove(userId: string, channelId: string): Promise<{ message: string }> {
    // 1. Tìm channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { role: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra user có phải Channel Admin không
    const membership = channel.members.find((m) => m.userId === userId);

    if (!membership) {
      throw new ForbiddenException('Bạn không thuộc channel này');
    }

    if (membership.role.name !== ROLES.CHANNEL_ADMIN) {
      throw new ForbiddenException('Chỉ Channel Admin mới có quyền xóa channel');
    }

    // 3. Xóa channel (cascade sẽ tự động xóa members, messages,...)
    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    return {
      message: 'Xóa channel thành công',
    };
  }

  /**
   * Thêm thành viên vào Channel
   * Chỉ Channel Admin mới có quyền
   * Có thể thêm bằng email hoặc userId
   */
  async addMember(
    userId: string,
    channelId: string,
    dto: AddChannelMemberDto,
  ): Promise<ChannelMemberResponseDto> {
    // Validation đã được xử lý ở DTO level với @ValidateIf

    // 2. Tìm channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { role: true },
        },
        workspace: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 3. Kiểm tra user có phải Channel Admin không
    const adminMembership = channel.members.find((m) => m.userId === userId);

    if (!adminMembership) {
      throw new ForbiddenException('Bạn không thuộc channel này');
    }

    if (adminMembership.role.name !== ROLES.CHANNEL_ADMIN) {
      throw new ForbiddenException(
        'Chỉ Channel Admin mới có quyền thêm thành viên',
      );
    }

    // 4. Tìm user cần thêm
    const targetUser = await this.prisma.user.findFirst({
      where: dto.email
        ? { email: dto.email }
        : { id: dto.userId },
    });

    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // 5. Kiểm tra user có thuộc workspace không
    const workspaceMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (!workspaceMembership) {
      throw new BadRequestException(
        'User phải là thành viên của workspace trước khi tham gia channel',
      );
    }

    // 6. Kiểm tra user đã là member của channel chưa
    const existingMembership = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('User đã là thành viên của channel này');
    }

    // 7. Lấy role CHANNEL_MEMBER
    const memberRole = await this.prisma.role.findUnique({
      where: { name: ROLES.CHANNEL_MEMBER },
    });

    if (!memberRole) {
      throw new NotFoundException('Role CHANNEL_MEMBER not found');
    }

    // 8. Thêm user vào channel
    const newMember = await this.prisma.channelMember.create({
      data: {
        channelId,
        userId: targetUser.id,
        roleId: memberRole.id,
      },
      include: {
        role: true,
        user: true,
      },
    });

    return {
      id: newMember.id,
      channelId: newMember.channelId,
      userId: newMember.userId,
      roleName: newMember.role.name,
      joinedAt: newMember.joinedAt,
      user: {
        id: newMember.user.id,
        email: newMember.user.email,
        username: newMember.user.username,
        fullName: newMember.user.fullName,
        avatarUrl: newMember.user.avatarUrl ?? undefined,
      },
    };
  }

  /**
   * Xóa thành viên khỏi Channel
   * Chỉ Channel Admin mới có quyền
   * Không thể tự xóa chính mình nếu là Admin duy nhất
   */
  async removeMember(
    userId: string,
    channelId: string,
    memberId: string,
  ): Promise<{ message: string }> {
    // 1. Tìm channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { role: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra user có phải Channel Admin không
    const adminMembership = channel.members.find((m) => m.userId === userId);

    if (!adminMembership) {
      throw new ForbiddenException('Bạn không thuộc channel này');
    }

    if (adminMembership.role.name !== ROLES.CHANNEL_ADMIN) {
      throw new ForbiddenException(
        'Chỉ Channel Admin mới có quyền xóa thành viên',
      );
    }

    // 3. Tìm member cần xóa
    const memberToRemove = await this.prisma.channelMember.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Không tìm thấy thành viên này');
    }

    if (memberToRemove.channelId !== channelId) {
      throw new BadRequestException('Member không thuộc channel này');
    }

    // 4. Kiểm tra không thể xóa Admin duy nhất
    const adminCount = channel.members.filter(
      (m) => m.role.name === ROLES.CHANNEL_ADMIN,
    ).length;

    if (
      memberToRemove.role.name === ROLES.CHANNEL_ADMIN &&
      adminCount === 1
    ) {
      throw new BadRequestException(
        'Không thể xóa Admin duy nhất của channel. Hãy chỉ định Admin mới trước.',
      );
    }

    // 5. Xóa member
    await this.prisma.channelMember.delete({
      where: { id: memberId },
    });

    return {
      message: 'Đã xóa thành viên khỏi channel',
    };
  }

  /**
   * Xem danh sách thành viên của Channel
   * Channel Member hoặc Channel Admin
   */
  async getMembers(
    userId: string,
    channelId: string,
  ): Promise<ChannelMemberResponseDto[]> {
    // 1. Tìm channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            role: true,
            user: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra user có phải member của channel không
    const membership = channel.members.find((m) => m.userId === userId);

    if (!membership) {
      throw new ForbiddenException(
        'Bạn phải là thành viên của channel để xem danh sách',
      );
    }

    // 3. Trả về danh sách members
    return channel.members.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      userId: m.userId,
      roleName: m.role.name,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        email: m.user.email,
        username: m.user.username,
        fullName: m.user.fullName,
        avatarUrl: m.user.avatarUrl ?? undefined,
      },
    }));
  }
}

