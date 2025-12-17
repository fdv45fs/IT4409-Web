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
export class MaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  // ============================================================
  // LIST ROOT MATERIALS (folders + files)
  // ============================================================
  async listRootMaterials(channelId: string) {
    const folders = await this.prisma.folder.findMany({
      where: { channelId, parentId: null },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total size for each folder
    const foldersWithSize = await Promise.all(
      folders.map(async (folder) => {
        const totalSize = await this.calculateFolderSize(folder.id);
        return { ...folder, totalSize };
      }),
    );

    const files = await this.listFiles(channelId, null);

    // Combine and return as array
    return [...foldersWithSize, ...files];
  }

  // Helper to calculate total size of all files in a folder (recursive)
  private async calculateFolderSize(folderId: string): Promise<number> {
    // Get direct files in this folder
    const files = await this.prisma.file.findMany({
      where: { folderId },
      select: { fileSize: true },
    });

    let totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    // Get subfolders and recursively calculate their sizes
    const subfolders = await this.prisma.folder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    });

    for (const subfolder of subfolders) {
      totalSize += await this.calculateFolderSize(subfolder.id);
    }

    return totalSize;
  }

  // ============================================================
  // LIST FOLDER
  // ============================================================
  async listFolder(channelId: string, folderId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.channelId !== channelId)
      throw new NotFoundException('Folder not found');

    const subfolders = await this.prisma.folder.findMany({
      where: { parentId: folderId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total size for each subfolder
    const subfoldersWithSize = await Promise.all(
      subfolders.map(async (subfolder) => {
        const totalSize = await this.calculateFolderSize(subfolder.id);
        return { ...subfolder, totalSize };
      }),
    );

    const files = await this.listFiles(channelId, folderId);

    return { folder, subfolders: subfoldersWithSize, files };
  }

  // ============================================================
  // LIST FILES
  // ============================================================
  async listFiles(channelId: string, folderId: string | null) {
    return this.prisma.file.findMany({
      where: { channelId, folderId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  // ============================================================
  // CREATE FOLDER
  // ============================================================
  async createFolder(
    channelId: string,
    userId: string,
    name: string,
    parentId: string | null,
  ) {
    if (parentId) {
      // kiểm tra folder cha
      const parent = await this.prisma.folder.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.channelId !== channelId)
        throw new NotFoundException('Parent folder not found');
    }

    return this.prisma.folder.create({
      data: {
        name,
        channelId,
        parentId,
      },
    });
  }

  // ============================================================
  // UPLOAD FILES
  // ============================================================
  async uploadFiles(
    channelId: string,
    userId: string,
    files: MulterFile[],
    folderId: string | null,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) throw new NotFoundException('Channel not found');
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    if (folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder || folder.channelId !== channelId)
        throw new NotFoundException('Folder not found');
    }

    // Upload lên S3
    const uploadResults = await this.uploadService.uploadMulti(
      files,
      `channel/${channelId}/materials`,
    );

    try {
      // Ghi DB
      const created = await this.prisma.$transaction(
        uploadResults.map((res, idx) => {
          const original = files[idx];

          const safeName = path
            .basename(original.originalname)
            .replace(/[^\w.\- ]/g, '');

          return this.prisma.file.create({
            data: {
              channelId,
              folderId,
              uploadedBy: userId,
              fileName: safeName,
              fileUrl: res.url,
              s3Key: res.key,
              mimeType: original.mimetype,
              fileSize: original.size,
              extension: (() => {
                const parts = safeName.split('.');
                return parts.length > 1 ? parts[parts.length - 1] : '';
              })(),
            },
          });
        }),
      );

      return created;
    } catch (error) {
      // rollback S3
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

  // ============================================================
  // DELETE FILE
  // ============================================================
  async deleteFile(channelId: string, fileId: string, user: any) {
    const record = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!record) throw new NotFoundException('File not found');
    if (record.channelId !== channelId)
      throw new ForbiddenException('File does not belong to this channel');

    // Rule: admin hoặc chính chủ
    if (record.uploadedBy !== user.id && !user.roles.includes('CHANNEL_ADMIN'))
      throw new ForbiddenException('Not allowed to delete this file');

    // Xóa trên S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: record.s3Key,
        }),
      );
    } catch (err) {
      console.error(
        `Failed to delete S3 object for fileId=${fileId}, s3Key=${record.s3Key}:`,
        err,
      );
    }

    await this.prisma.file.delete({ where: { id: fileId } });

    return { message: 'File deleted' };
  }

  // ============================================================
  // DELETE FOLDER RECURSIVE
  // ============================================================
  async deleteFolderRecursive(channelId: string, folderId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.channelId !== channelId)
      throw new NotFoundException('Folder not found');

    // Xóa tất cả file trong folder
    const files = await this.prisma.file.findMany({ where: { folderId } });
    for (const file of files) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: file.s3Key,
          }),
        );
      } catch (e) {}
    }

    // Xóa toàn bộ subfolder (đệ quy)
    const subfolders = await this.prisma.folder.findMany({
      where: { parentId: folderId },
    });

    for (const sub of subfolders) {
      await this.deleteFolderRecursive(channelId, sub.id);
    }

    // Xóa folder cha
    await this.prisma.folder.delete({ where: { id: folderId } });

    return { message: 'Folder deleted' };
  }
}
