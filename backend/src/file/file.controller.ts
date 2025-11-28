import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles.constant';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';

@Controller('channels/:channelId/files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  async list(@Param('channelId') channelId: string) {
    return this.fileService.listFiles(channelId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 20))
  async upload(
    @Param('channelId') channelId: string,
    @Req() req,
    @UploadedFiles() files: MulterFile[],
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    return this.fileService.uploadFiles(channelId, req.user.id, files);
  }

  @Delete(':fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.CHANNEL_ADMIN)
  async remove(
    @Param('channelId') channelId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.fileService.deleteFile(channelId, fileId);
  }
}
