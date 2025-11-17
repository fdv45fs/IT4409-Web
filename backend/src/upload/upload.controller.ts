import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { File as MulterFile } from 'multer';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** ---------------------------
   *  Avatar cá nhân
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: MulterFile) {
    if (!file) throw new BadRequestException('File is required');

    return this.uploadService.uploadSingle(file, `avatars`);
  }

  /** ---------------------------
   *  Ảnh đại diện Workspace
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('workspace/:workspaceId/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWorkspaceAvatar(
    @UploadedFile() file: MulterFile,
    @Param('workspaceId') workspaceId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');

    return this.uploadService.uploadSingle(
      file,
      `workspace/${workspaceId}/avatar`,
    );
  }

  /** ---------------------------
   *  Ảnh channel (avatar)
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('channel/:channelId/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadChannelImage(
    @UploadedFile() file: MulterFile,
    @Param('channelId') channelId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');

    return this.uploadService.uploadSingle(file, `channel/${channelId}/avatar`);
  }

  /** ---------------------------
   *  Tài liệu channel (PDF, Excel, docs...)
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('channel/:channelId/docs')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadChannelDocs(
    @UploadedFiles() files: MulterFile[],
    @Param('channelId') channelId: string,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    return this.uploadService.uploadMulti(files, `channel/${channelId}/docs`);
  }

  /** ---------------------------
   *  Upload file trong tin nhắn (message)
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('channel/:channelId/messages/:messageId/files')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMessageFiles(
    @UploadedFiles() files: MulterFile[],
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    return this.uploadService.uploadMulti(
      files,
      `channel/${channelId}/messages/${messageId}`,
    );
  }
}
