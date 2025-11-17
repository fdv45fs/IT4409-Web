import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dtos/create-workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update-workspace.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';
import { ROLES } from '../common/constants/roles.constant';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  // 5. Tạo workspace
  async create(
    userId: string,
    dto: CreateWorkspaceDto,
    avatarUrl?: string, // thêm param avatarUrl
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatarUrl: avatarUrl ?? null, // sử dụng param avatarUrl thay vì dto
      },
    });

    const role = await this.prisma.role.findUnique({
      where: { name: ROLES.WORKSPACE_ADMIN },
    });

    if (!role) throw new NotFoundException('Role WORKSPACE_ADMIN not found');

    await this.prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId, roleId: role.id },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description ?? undefined,
      avatarUrl: workspace.avatarUrl ?? undefined,
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
      createdAt: workspace.createdAt,
      myRole: membership.role?.name ?? null,
      memberCount: workspace.members.length,
    };
  }
}
