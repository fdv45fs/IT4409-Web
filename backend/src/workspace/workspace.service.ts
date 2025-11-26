import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dtos/create-workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update-workspace.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';
import { WorkspaceMemberListResponseDto } from './dtos/workspace-member-response.dto';
import { WorkspaceJoinRequestListResponseDto } from './dtos/workspace-join-request-response.dto';
import { ROLES } from '../common/constants/roles.constant';
import { randomBytes } from 'crypto';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  private generateJoinCode(): string {
    return randomBytes(4).toString('hex'); // ví dụ: a3f8c912
  }

  // 5. Tạo workspace
  async create(
    userId: string,
    dto: CreateWorkspaceDto,
    avatarUrl?: string,
  ): Promise<WorkspaceResponseDto> {
    const joinCode = this.generateJoinCode();

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatarUrl: avatarUrl ?? null,
        isPrivate: dto.isPrivate ?? false,
        joinCode,
      },
    });

    const role = await this.prisma.role.findUnique({
      where: { name: ROLES.WORKSPACE_ADMIN },
    });

    if (!role) throw new NotFoundException('Role WORKSPACE_ADMIN not found');

    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        roleId: role.id,
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description ?? undefined,
      avatarUrl: workspace.avatarUrl ?? undefined,
      isPrivate: workspace.isPrivate,
      joinCode: workspace.joinCode!,
      createdAt: workspace.createdAt,
      myRole: role.name,
      memberCount: 1,
    };
  }

  // 6. Lấy danh sách workspace user tham gia
  async findAllByUser(userId: string): Promise<WorkspaceResponseDto[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { include: { members: true } }, role: true },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      description: m.workspace.description ?? undefined,
      avatarUrl: m.workspace.avatarUrl ?? undefined,
      isPrivate: m.workspace.isPrivate,
      joinCode: m.workspace.joinCode!,
      createdAt: m.workspace.createdAt,
      updatedAt: m.workspace.updatedAt,
      myRole: m.role?.name ?? null,
      memberCount: m.workspace.members.length,
    }));
  }

  // 7. Xem chi tiết workspace
  async findOne(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { include: { role: true } } },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const membership = workspace.members.find((m) => m.userId === userId);
    if (!membership)
      throw new ForbiddenException('Bạn không có quyền xem workspace này');

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description ?? undefined,
      isPrivate: workspace.isPrivate,
      joinCode: workspace.joinCode!,
      avatarUrl: workspace.avatarUrl ?? undefined,
      createdAt: workspace.createdAt,
      myRole: membership.role?.name ?? null,
      memberCount: workspace.members.length,
    };
  }

  // 8. Cập nhật workspace (chỉ admin)
  async update(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });

    if (!membership || membership.role?.name !== ROLES.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền cập nhật workspace này');
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { ...dto },
      include: { members: { include: { role: true } } },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description ?? undefined,
      avatarUrl: workspace.avatarUrl ?? undefined,
      isPrivate: workspace.isPrivate,
      joinCode: workspace.joinCode!,
      createdAt: workspace.createdAt,
      myRole: membership.role?.name ?? null,
      memberCount: workspace.members.length,
    };
  }

  async getMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberListResponseDto> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true, role: true },
      orderBy: { joinedAt: 'asc' },
    });

    const totalCount = await this.prisma.workspaceMember.count({
      where: { workspaceId },
    });

    const myMembership = members.find((m) => m.userId === userId);
    if (!myMembership) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thành viên workspace này',
      );
    }

    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        username: m.user.username,
        fullName: m.user.fullName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl ?? undefined,
        role: m.role.name,
        joinedAt: m.joinedAt,
      })),
      totalCount,
      myRole: myMembership.role.name,
    };
  }

  async getJoinRequests(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceJoinRequestListResponseDto> {
    const requests = await this.prisma.workspaceJoinRequest.findMany({
      where: { workspaceId, status: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalCount = await this.prisma.workspaceJoinRequest.count({
      where: { workspaceId, status: 'PENDING' },
    });

    const myMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });

    if (!myMembership || myMembership.role.name !== ROLES.WORKSPACE_ADMIN) {
      throw new ForbiddenException(
        'Bạn không có quyền xem yêu cầu tham gia workspace này',
      );
    }

    return {
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.user.username,
        fullName: r.user.fullName,
        email: r.user.email,
        status: r.status,
        createdAt: r.createdAt,
      })),
      totalCount,
      myRole: myMembership.role.name,
    };
  }

  async joinWorkspace(userId: string, joinCode: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { joinCode },
      include: { members: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    // Nếu user đã là thành viên thì return luôn
    const existingMember = workspace.members.find((m) => m.userId === userId);
    if (existingMember) {
      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        status: 'APPROVED',
      };
    }

    if (!workspace.isPrivate) {
      // Public workspace: vào thẳng
      const memberRole = await this.prisma.role.findUnique({
        where: { name: 'WORKSPACE_MEMBER' },
      });
      if (!memberRole)
        throw new NotFoundException('Role WORKSPACE_MEMBER not found');

      await this.prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId, roleId: memberRole.id },
      });

      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        status: 'APPROVED',
      };
    }

    // Private workspace: tạo request nếu chưa có
    const existingRequest = await this.prisma.workspaceJoinRequest.findFirst({
      where: { workspaceId: workspace.id, userId, status: 'PENDING' },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending join request for this workspace',
      );
    }

    const joinRequest = await this.prisma.workspaceJoinRequest.create({
      data: { workspaceId: workspace.id, userId },
    });

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      status: joinRequest.status,
    };
  }

  // Chấp nhận join request
  async acceptRequest(workspaceId: string, requestId: string) {
    const request = await this.prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.workspaceId !== workspaceId)
      throw new NotFoundException('Request not found');

    await this.prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    const memberRole = await this.prisma.role.findUnique({
      where: { name: 'WORKSPACE_MEMBER' },
    });
    if (!memberRole)
      throw new NotFoundException('Role WORKSPACE_MEMBER not found');

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: request.userId,
        roleId: memberRole.id,
      },
    });
  }

  // Từ chối join request
  async rejectRequest(workspaceId: string, requestId: string) {
    const request = await this.prisma.workspaceJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.workspaceId !== workspaceId)
      throw new NotFoundException('Request not found');

    return this.prisma.workspaceJoinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  // 9. Xóa workspace (chỉ admin)
  async remove(userId: string, workspaceId: string): Promise<{ message: string }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });

    if (!membership || membership.role?.name !== ROLES.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xóa workspace này');
    }

    // Xóa workspace, Prisma sẽ tự động cascade xóa các bảng liên quan (members, channels, etc.)
    // nếu schema được cấu hình onDelete: Cascade.
    // Nếu không, cần xóa thủ công các bảng con trước.
    // Giả sử schema đã chuẩn.
    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { message: 'Xóa workspace thành công' };
  }

  // 10. Thêm thành viên vào workspace (bằng email)
  async addMember(userId: string, workspaceId: string, email: string) {
    // Check admin permission
    const adminMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });

    if (!adminMembership || adminMembership.role.name !== ROLES.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thêm thành viên');
    }

    const userToAdd = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      throw new NotFoundException('Không tìm thấy người dùng với email này');
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: userToAdd.id } },
    });

    if (existingMember) {
      throw new BadRequestException('Người dùng này đã là thành viên của workspace');
    }

    const memberRole = await this.prisma.role.findUnique({
      where: { name: ROLES.WORKSPACE_MEMBER },
    });

    if (!memberRole) throw new NotFoundException('Role WORKSPACE_MEMBER not found');

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userToAdd.id,
        roleId: memberRole.id,
      },
    });
  }

  // 11. Xóa thành viên khỏi workspace
  async removeMember(userId: string, workspaceId: string, memberId: string) {
    // Check admin permission
    const adminMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });

    if (!adminMembership || adminMembership.role.name !== ROLES.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xóa thành viên');
    }

    const memberToRemove = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Thành viên không tồn tại');
    }

    if (memberToRemove.workspaceId !== workspaceId) {
      throw new BadRequestException('Thành viên không thuộc workspace này');
    }

    if (memberToRemove.role.name === ROLES.WORKSPACE_ADMIN) {
      throw new BadRequestException('Không thể xóa Admin của workspace');
    }

    // Xóa thành viên (Prisma cascade sẽ xóa channel memberships nếu được cấu hình,
    // nhưng để chắc chắn ta nên xóa channel memberships trước hoặc dùng transaction)
    // Ở đây giả sử cascade delete được cấu hình trong schema.prisma hoặc xóa thủ công
    
    // Xóa khỏi tất cả channel trong workspace
    await this.prisma.channelMember.deleteMany({
      where: {
        userId: memberToRemove.userId,
        channel: {
          workspaceId: workspaceId
        }
      }
    });

    await this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return { message: 'Đã xóa thành viên khỏi workspace' };
  }

  // 12. Cập nhật role thành viên
  async updateMemberRole(
    userId: string,
    workspaceId: string,
    memberId: string,
    newRoleName: string,
  ) {
    // Check admin permission
    const adminMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });

    if (!adminMembership || adminMembership.role.name !== ROLES.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền cập nhật role');
    }

    const memberToUpdate = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!memberToUpdate) {
      throw new NotFoundException('Thành viên không tồn tại');
    }

    if (memberToUpdate.workspaceId !== workspaceId) {
      throw new BadRequestException('Thành viên không thuộc workspace này');
    }

    if (memberToUpdate.role.name === ROLES.WORKSPACE_ADMIN) {
      throw new BadRequestException('Không thể thay đổi role của Admin');
    }

    const newRole = await this.prisma.role.findUnique({
      where: { name: newRoleName },
    });

    if (!newRole) {
      throw new NotFoundException('Role không tồn tại');
    }

    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { roleId: newRole.id },
    });
  }
}
