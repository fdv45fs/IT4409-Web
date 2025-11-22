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
import { JoinChannelDto } from './dtos/join-channel.dto';
import { PromoteMemberDto } from './dtos/promote-member.dto';
import {
  ChannelResponseDto,
  ChannelListItemDto,
} from './dtos/channel-response.dto';
import { ChannelMemberResponseDto } from './dtos/channel-member-response.dto';
import { ChannelJoinRequestResponseDto } from './dtos/channel-join-request-response.dto';
import { ROLES } from '../common/constants/roles.constant';
import { randomBytes } from 'crypto';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  private generateJoinCode(): string {
    return randomBytes(4).toString('hex');
  }

  /**
   * Kiểm tra xem user có quyền admin trong channel không
   * User có quyền admin nếu:
   * 1. Là CHANNEL_ADMIN của channel đó, HOẶC
   * 2. Là WORKSPACE_ADMIN của workspace chứa channel đó
   */
  private async isChannelAdmin(
    userId: string,
    channelId: string,
  ): Promise<boolean> {
    // Lấy thông tin channel và workspace membership
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId },
          include: { role: true },
        },
      },
    });

    if (!channel) return false;

    // Check 1: User là CHANNEL_ADMIN của channel này
    const channelMembership = channel.members.find((m) => m.userId === userId);
    if (channelMembership?.role.name === ROLES.CHANNEL_ADMIN) {
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

    // 4. Tạo channel với joinCode (cả public và private đều có joinCode)
    const joinCode = this.generateJoinCode();

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

    // 2. Kiểm tra quyền xem
    // User có quyền nếu: là channel member HOẶC là workspace admin
    const channelMembership = channel.members.find((m) => m.userId === userId);
    let userRole: string | null = null;

    if (channelMembership) {
      userRole = channelMembership.role.name;
    } else {
      // Kiểm tra có phải Workspace Admin không
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
        userRole = ROLES.WORKSPACE_ADMIN;
      } else {
        throw new ForbiddenException('Bạn không có quyền xem channel này');
      }
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
      myRole: userRole,
      memberCount: channel.members.length,
    };
  }

  /**
   * Cập nhật Channel
   * Chỉ Channel Admin hoặc Workspace Admin mới có quyền
   */
  async update(
    userId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    // 1. Kiểm tra quyền admin (Channel Admin hoặc Workspace Admin)
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền cập nhật',
      );
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

      // Cả public và private đều có joinCode, không cần thay đổi joinCode khi update
      // Perform atomic update
      const updated = await tx.channel.update({
        where: { id: channelId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
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
   * Chỉ Channel Admin hoặc Workspace Admin mới có quyền
   */
  async remove(userId: string, channelId: string): Promise<{ message: string }> {
    // 1. Kiểm tra channel tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền admin (Channel Admin hoặc Workspace Admin)
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền xóa channel',
      );
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

    // 1. Tìm channel và kiểm tra tồn tại
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        workspace: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel không tồn tại');
    }

    // 2. Kiểm tra quyền admin (Channel Admin hoặc Workspace Admin)
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền thêm thành viên',
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
    // 1. Tìm channel và members để check admin count
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

    // 2. Kiểm tra quyền admin (Channel Admin hoặc Workspace Admin)
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền xóa thành viên',
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

    // 2. Kiểm tra quyền xem danh sách
    // User có quyền nếu: là channel member HOẶC là workspace admin
    const isChannelMember = channel.members.some((m) => m.userId === userId);
    
    if (!isChannelMember) {
      // Kiểm tra có phải Workspace Admin không
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
          'Bạn phải là thành viên của channel hoặc Workspace Admin để xem danh sách',
        );
      }
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

  /**
   * Join channel bằng join code
   * Public channel: Join thẳng
   * Private channel: Tạo join request, chờ duyệt
   */
  async joinChannelByCode(
    userId: string,
    dto: JoinChannelDto,
  ): Promise<{ message: string; channelId?: string; requestId?: string }> {
    // 1. Tìm channel bằng joinCode
    const channel = await this.prisma.channel.findUnique({
      where: { joinCode: dto.joinCode },
      include: {
        members: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Không tìm thấy channel với mã code này');
    }

    // 2. Kiểm tra user đã là member chưa
    const existingMembership = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Bạn đã là thành viên của channel này');
    }

    // 3. Kiểm tra user có thuộc workspace không
    const workspaceMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId,
        },
      },
    });

    if (!workspaceMembership) {
      throw new BadRequestException(
        'Bạn phải là thành viên của workspace trước khi tham gia channel',
      );
    }

    // 4. Public channel: Join thẳng
    if (!channel.isPrivate) {
      const memberRole = await this.prisma.role.findUnique({
        where: { name: ROLES.CHANNEL_MEMBER },
      });

      if (!memberRole) {
        throw new NotFoundException('Role CHANNEL_MEMBER not found');
      }

      await this.prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId,
          roleId: memberRole.id,
        },
      });

      return {
        message: 'Bạn đã tham gia channel thành công',
        channelId: channel.id,
      };
    }

    // 5. Private channel: Tạo join request
    // Kiểm tra đã có request pending chưa
    const existingRequest = await this.prisma.channelJoinRequest.findFirst({
      where: {
        channelId: channel.id,
        userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Bạn đã gửi yêu cầu tham gia channel này trước đó',
      );
    }

    const joinRequest = await this.prisma.channelJoinRequest.create({
      data: {
        channelId: channel.id,
        userId,
        status: 'PENDING',
      },
    });

    return {
      message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ admin duyệt.',
      requestId: joinRequest.id,
    };
  }

  /**
   * Xem danh sách join requests của channel
   * Chỉ Channel Admin hoặc Workspace Admin
   */
  async getJoinRequests(
    userId: string,
    channelId: string,
  ): Promise<ChannelJoinRequestResponseDto[]> {
    // 1. Kiểm tra quyền admin
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền xem join requests',
      );
    }

    // 2. Lấy danh sách requests
    const requests = await this.prisma.channelJoinRequest.findMany({
      where: { channelId },
      include: {
        user: true,
        channel: true,
        reviewer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((req) => ({
      id: req.id,
      channelId: req.channelId,
      userId: req.userId,
      status: req.status,
      createdAt: req.createdAt,
      reviewedAt: req.reviewedAt ?? undefined,
      reviewedBy: req.reviewedBy ?? undefined,
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        fullName: req.user.fullName,
        avatarUrl: req.user.avatarUrl ?? undefined,
      },
      channel: {
        id: req.channel.id,
        name: req.channel.name,
        workspaceId: req.channel.workspaceId,
      },
    }));
  }

  /**
   * Chấp nhận join request
   * Chỉ Channel Admin hoặc Workspace Admin
   */
  async approveJoinRequest(
    userId: string,
    channelId: string,
    requestId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra quyền admin
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền duyệt join requests',
      );
    }

    // 2. Tìm join request
    const request = await this.prisma.channelJoinRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy join request');
    }

    if (request.channelId !== channelId) {
      throw new BadRequestException('Request không thuộc channel này');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request này đã được xử lý trước đó');
    }

    // 3. Cập nhật request status thành APPROVED
    await this.prisma.channelJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });

    // 4. Thêm user vào channel
    const memberRole = await this.prisma.role.findUnique({
      where: { name: ROLES.CHANNEL_MEMBER },
    });

    if (!memberRole) {
      throw new NotFoundException('Role CHANNEL_MEMBER not found');
    }

    // Kiểm tra chưa phải member
    const existingMember = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: request.userId,
        },
      },
    });

    if (!existingMember) {
      await this.prisma.channelMember.create({
        data: {
          channelId,
          userId: request.userId,
          roleId: memberRole.id,
        },
      });
    }

    return {
      message: `Đã chấp nhận yêu cầu của ${request.user.fullName}`,
    };
  }

  /**
   * Từ chối join request
   * Chỉ Channel Admin hoặc Workspace Admin
   */
  async rejectJoinRequest(
    userId: string,
    channelId: string,
    requestId: string,
  ): Promise<{ message: string }> {
    // 1. Kiểm tra quyền admin
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền duyệt join requests',
      );
    }

    // 2. Tìm join request
    const request = await this.prisma.channelJoinRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy join request');
    }

    if (request.channelId !== channelId) {
      throw new BadRequestException('Request không thuộc channel này');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request này đã được xử lý trước đó');
    }

    // 3. Cập nhật request status thành REJECTED
    await this.prisma.channelJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });

    return {
      message: `Đã từ chối yêu cầu của ${request.user.fullName}`,
    };
  }

  /**
   * Rời khỏi channel
   * User tự rời channel
   * Nếu là Channel Admin duy nhất → Phải transfer quyền trước
   */
  async leaveChannel(
    userId: string,
    channelId: string,
  ): Promise<{ message: string }> {
    // 1. Tìm channel và membership
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

    // 2. Kiểm tra user có phải member không
    const membership = channel.members.find((m) => m.userId === userId);

    if (!membership) {
      throw new BadRequestException('Bạn không phải thành viên của channel này');
    }

    // 3. Kiểm tra nếu là Channel Admin duy nhất
    const adminCount = channel.members.filter(
      (m) => m.role.name === ROLES.CHANNEL_ADMIN,
    ).length;

    if (membership.role.name === ROLES.CHANNEL_ADMIN && adminCount === 1) {
      throw new BadRequestException(
        'Bạn là Admin duy nhất của channel. Vui lòng chỉ định Admin mới trước khi rời channel.',
      );
    }

    // 4. Xóa membership
    await this.prisma.channelMember.delete({
      where: { id: membership.id },
    });

    return {
      message: 'Bạn đã rời khỏi channel thành công',
    };
  }

  /**
   * Thay đổi role của member trong channel
   * Promote thành Admin hoặc Demote thành Member
   * Chỉ Channel Admin hoặc Workspace Admin
   */
  async updateMemberRole(
    userId: string,
    channelId: string,
    memberId: string,
    dto: PromoteMemberDto,
  ): Promise<ChannelMemberResponseDto> {
    // 1. Kiểm tra quyền admin
    const hasAdminPermission = await this.isChannelAdmin(userId, channelId);

    if (!hasAdminPermission) {
      throw new ForbiddenException(
        'Chỉ Channel Admin hoặc Workspace Admin mới có quyền thay đổi role',
      );
    }

    // 2. Tìm member cần update
    const member = await this.prisma.channelMember.findUnique({
      where: { id: memberId },
      include: {
        role: true,
        user: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy member này');
    }

    if (member.channelId !== channelId) {
      throw new BadRequestException('Member không thuộc channel này');
    }

    // 3. Kiểm tra không thể demote Admin duy nhất
    if (member.role.name === ROLES.CHANNEL_ADMIN && dto.newRole === 'CHANNEL_MEMBER') {
      const adminCount = await this.prisma.channelMember.count({
        where: {
          channelId,
          role: {
            name: ROLES.CHANNEL_ADMIN,
          },
        },
      });

      if (adminCount === 1) {
        throw new BadRequestException(
          'Không thể demote Admin duy nhất của channel. Hãy promote member khác trước.',
        );
      }
    }

    // 4. Lấy role mới
    const newRole = await this.prisma.role.findUnique({
      where: { name: dto.newRole },
    });

    if (!newRole) {
      throw new NotFoundException(`Role ${dto.newRole} not found`);
    }

    // 5. Cập nhật role
    const updatedMember = await this.prisma.channelMember.update({
      where: { id: memberId },
      data: {
        roleId: newRole.id,
      },
      include: {
        role: true,
        user: true,
      },
    });

    return {
      id: updatedMember.id,
      channelId: updatedMember.channelId,
      userId: updatedMember.userId,
      roleName: updatedMember.role.name,
      joinedAt: updatedMember.joinedAt,
      user: {
        id: updatedMember.user.id,
        email: updatedMember.user.email,
        username: updatedMember.user.username,
        fullName: updatedMember.user.fullName,
        avatarUrl: updatedMember.user.avatarUrl ?? undefined,
      },
    };
  }
}

