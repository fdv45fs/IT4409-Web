import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dtos/create-workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update-workspace.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';
import { WorkspaceMemberListResponseDto } from './dtos/workspace-member-response.dto';
import { CreateWorkspaceJoinRequestDto } from './dtos/create-workspace-join-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles.constant';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../upload/upload.service';
import type { File as MulterFile } from 'multer';
import { AddWorkspaceMemberDto } from './dtos/add-workspace-member.dto';
import { UpdateMemberRoleDto } from './dtos/update-member-role.dto';

@ApiTags('Workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private workspaceService: WorkspaceService,
    private uploadService: UploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Create a new workspace with optional avatar file' })
  @ApiBody({ type: CreateWorkspaceDto })
  @ApiResponse({
    status: 201,
    description: 'Workspace successfully created',
    type: WorkspaceResponseDto,
  })
  async create(
    @Req() req,
    @Body() dto: CreateWorkspaceDto,
    @UploadedFile() avatar?: MulterFile,
  ): Promise<WorkspaceResponseDto> {
    let avatarUrl: string | undefined;

    if (avatar) {
      const uploadResult = await this.uploadService.uploadSingle(
        avatar,
        `workspace/temp`,
      );
      avatarUrl = uploadResult.url;
    }

    // Truyền DTO + avatarUrl xuống service
    return this.workspaceService.create(req.user.id, dto, avatarUrl);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of workspaces',
    type: [WorkspaceResponseDto],
  })
  findAll(@Req() req): Promise<WorkspaceResponseDto[]> {
    return this.workspaceService.findAllByUser(req.user.id);
  }

  @Patch(':workspaceId')
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Roles(ROLES.WORKSPACE_ADMIN)
  @ApiOperation({ summary: 'Update a workspace (ADMIN only)' })
  @ApiParam({
    name: 'workspaceId',
    description: 'ID of the workspace to update',
  })
  @ApiBody({ type: UpdateWorkspaceDto })
  @ApiResponse({
    status: 200,
    description: 'Workspace successfully updated',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to update this workspace',
  })
  update(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.update(req.user.id, workspaceId, dto);
  }

  @Get('/:workspaceId/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    ROLES.WORKSPACE_MEMBER,
    ROLES.WORKSPACE_ADMIN,
    ROLES.WORKSPACE_PRIVILEGE_MEMBER,
  )
  async getMembers(
    @Param('workspaceId') workspaceId: string,
    @Req() req,
  ): Promise<WorkspaceMemberListResponseDto> {
    return this.workspaceService.getMembers(workspaceId, req.user.id);
  }

  // Join workspace request
  @Post('join-requests')
  @UseGuards(JwtAuthGuard)
  async joinWorkspace(@Req() req, @Body() dto: CreateWorkspaceJoinRequestDto) {
    return this.workspaceService.joinWorkspace(req.user.id, dto.joinCode);
  }

  // Get join requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':workspaceId/join-requests')
  @Roles(ROLES.WORKSPACE_ADMIN)
  async getJoinRequest(@Param('workspaceId') workspaceId: string, @Req() req) {
    return this.workspaceService.getJoinRequests(workspaceId, req.user.id);
  }

  // Get workspace details
  @Get(':workspaceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    ROLES.WORKSPACE_MEMBER,
    ROLES.WORKSPACE_ADMIN,
    ROLES.WORKSPACE_PRIVILEGE_MEMBER,
  )
  @ApiOperation({ summary: 'Get workspace details by ID' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  @ApiResponse({
    status: 200,
    description: 'Workspace details',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this workspace',
  })
  findOne(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.findOne(req.user.id, workspaceId);
  }

  // Accept request
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':workspaceId/join-requests/:requestId/accept')
  @Roles(ROLES.WORKSPACE_ADMIN)
  async accept(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.workspaceService.acceptRequest(workspaceId, requestId);
  }

  // Reject request
  @Put(':workspaceId/join-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.WORKSPACE_ADMIN)
  async reject(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.workspaceService.rejectRequest(workspaceId, requestId);
  }

  // Delete a workspace
  @Delete(':workspaceId')
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Roles(ROLES.WORKSPACE_ADMIN)
  @ApiOperation({ summary: 'Delete a workspace (ADMIN only)' })
  @ApiParam({
    name: 'workspaceId',
    description: 'ID of the workspace to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspace successfully deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to delete this workspace',
  })
  remove(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
  ): Promise<{ message: string }> {
    return this.workspaceService.remove(req.user.id, workspaceId);
  }

  // Add member to workspace
  @Post(':workspaceId/members')
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Roles(ROLES.WORKSPACE_ADMIN)
  @ApiOperation({ summary: 'Add member to workspace (ADMIN only)' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  @ApiBody({ type: AddWorkspaceMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  addMember(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AddWorkspaceMemberDto,
  ) {
    return this.workspaceService.addMember(req.user.id, workspaceId, dto.email);
  }

  // Remove member from workspace
  @Delete(':workspaceId/members/:memberId')
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Roles(ROLES.WORKSPACE_ADMIN)
  @ApiOperation({ summary: 'Remove member from workspace (ADMIN only)' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  @ApiParam({ name: 'memberId', description: 'ID of the member to remove' })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  removeMember(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspaceService.removeMember(
      req.user.id,
      workspaceId,
      memberId,
    );
  }

  // Update member role
  @Patch(':workspaceId/members/:memberId/role')
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Roles(ROLES.WORKSPACE_ADMIN)
  @ApiOperation({ summary: 'Update member role (ADMIN only)' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  @ApiParam({ name: 'memberId', description: 'ID of the member to update' })
  @ApiBody({ type: UpdateMemberRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
  })
  updateMemberRole(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(
      req.user.id,
      workspaceId,
      memberId,
      dto.role,
    );
  }

  // Search workspace (channels + members)
  @Get(':workspaceId/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    ROLES.WORKSPACE_MEMBER,
    ROLES.WORKSPACE_ADMIN,
    ROLES.WORKSPACE_PRIVILEGE_MEMBER,
  )
  @ApiOperation({ summary: 'Search channels and members in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  @ApiResponse({
    status: 200,
    description: 'Search results containing channels and members',
  })
  async search(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
  ) {
    return this.workspaceService.search(req.user.id, workspaceId, query || '');
  }
}
