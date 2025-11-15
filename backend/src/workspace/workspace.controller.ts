import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles.constant';

@ApiTags('Workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiBody({ type: CreateWorkspaceDto })
  @ApiResponse({
    status: 201,
    description: 'Workspace successfully created',
    type: WorkspaceResponseDto,
  })
  create(
    @Req() req,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of workspaces',
    type: [WorkspaceResponseDto],
  })
  findAll(@Req() req): Promise<WorkspaceResponseDto[]> {
    return this.workspaceService.findAllByUser(req.user.id);
  }

  @Get(':workspaceId')
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

  @Patch(':workspaceId')
  @UseGuards(RolesGuard)
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
}
