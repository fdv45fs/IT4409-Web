import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import type { File as MulterFile } from 'multer';
import { s3Client, S3_BUCKET } from '../upload/s3.config';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async listFiles(channelId: string) {
    return this.prisma.file.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }

  async uploadFiles(channelId: string, userId: string, files: MulterFile[]) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    // 1. Upload lên S3
    const uploadResults = await this.uploadService.uploadMulti(
      files,
      `channel/${channelId}/files`,
    );

    try {
      // (3) Ghi DB trong transaction
      const created = await this.prisma.$transaction(
        uploadResults.map((res, idx) => {
          const original = files[idx];

          // sanitize file name
          const safeName = path
            .basename(original.originalname)
            .replace(/[^\w.\- ]/g, '');

          return this.prisma.file.create({
            data: {
              channelId,
              uploadedBy: userId,
              fileName: safeName,
              fileUrl: res.url,
              s3Key: res.key,
              mimeType: original.mimetype,
              fileSize: original.size,
              extension: safeName.split('.').pop() ?? '',
            },
          });
        }),
      );

      return created;
    } catch (error) {
      // (4) Rollback S3
      await Promise.all(
        uploadResults.map((res) =>
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: S3_BUCKET,
              Key: res.key,
            }),
          ),
        ),
      );
      throw error;
    }
  }

  async deleteFile(channelId: string, fileId: string) {
    const record = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!record) throw new NotFoundException('File not found');
    if (record.channelId !== channelId)
      throw new ForbiddenException('File does not belong to this channel');

    await s3Client.send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: record.s3Key }),
    );

    await this.prisma.file.delete({ where: { id: fileId } });

    return { message: 'File deleted' };
  }
}
