import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { MaterialService } from './material.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles.constant';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';

@Controller('channels/:channelId/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  async list(@Param('channelId') channelId: string) {
    return this.materialService.listRootMaterials(channelId);
  }

  @Get('folders/:folderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  async listFolder(
    @Param('channelId') channelId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.materialService.listFolder(channelId, folderId);
  }

  // Tạo folder ở root
  @Post('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  async createRootFolder(
    @Param('channelId') channelId: string,
    @Req() req,
    @Body('name') name: string,
  ) {
    if (!name) throw new BadRequestException('Folder name is required');

    return this.materialService.createFolder(
      channelId,
      req.user.id,
      name,
      null,
    );
  }

  // Tạo folder bên trong folder khác
  @Post('folders/:parentFolderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  async createNestedFolder(
    @Param('channelId') channelId: string,
    @Param('parentFolderId') parentFolderId: string,
    @Req() req,
    @Body('name') name: string,
  ) {
    if (!name) throw new BadRequestException('Folder name is required');

    return this.materialService.createFolder(
      channelId,
      req.user.id,
      name,
      parentFolderId,
    );
  }

  // 📌 UPLOAD FILE ROOT
  @Post('files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadRoot(
    @Param('channelId') channelId: string,
    @Req() req,
    @UploadedFiles() files: MulterFile[],
  ) {
    return this.materialService.uploadFiles(
      channelId,
      req.user.id,
      files,
      null,
    );
  }

  // 📌 UPLOAD FILE TRONG FOLDER
  @Post('folders/:folderId/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadToFolder(
    @Param('channelId') channelId: string,
    @Param('folderId') folderId: string,
    @Req() req,
    @UploadedFiles() files: MulterFile[],
  ) {
    return this.materialService.uploadFiles(
      channelId,
      req.user.id,
      files,
      folderId,
    );
  }

  // 📌 DELETE FILE (Admin hoặc Owner)
  @Delete('files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  async removeFile(
    @Param('channelId') channelId: string,
    @Param('fileId') fileId: string,
    @Req() req,
  ) {
    return this.materialService.deleteFile(channelId, fileId, req.user);
  }

  // 📌 DELETE FOLDER (xóa recursive)
  @Delete('folders/:folderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_ADMIN, ROLES.CHANNEL_ADMIN)
  async removeFolder(
    @Param('channelId') channelId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.materialService.deleteFolderRecursive(channelId, folderId);
  }
}
