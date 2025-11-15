import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLES } from '../constants/roles.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user, params } = context.switchToHttp().getRequest();

    const workspaceId = params.workspaceId;
    const channelId = params.channelId;

    // --- CASE 1: Workspace Role ---
    if (requiredRoles.some((r) => r.startsWith('WORKSPACE_'))) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: user.id },
        },
        include: { role: true },
      });

      if (!membership || !requiredRoles.includes(membership.role.name)) {
        throw new ForbiddenException('Bạn không có quyền trong Workspace');
      }
    }

    // --- CASE 2: Channel Role ---
    if (requiredRoles.some((r) => r.startsWith('CHANNEL_'))) {
      const membership = await this.prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId, userId: user.id },
        },
        include: { role: true },
      });

      if (!membership || !requiredRoles.includes(membership.role.name)) {
        throw new ForbiddenException('Bạn không có quyền trong Channel');
      }
    }

    return true;
  }
}
