import { Injectable, BadRequestException } from '@nestjs/common';
import { s3Client, S3_BUCKET } from './s3.config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { File as MulterFile } from 'multer';
import { createReadStream } from 'fs';

@Injectable()
export class UploadService {
  /** Upload 1 file */
  async uploadSingle(file: MulterFile, folder: string) {
    if (!file) throw new BadRequestException('File is required');

    const key = `${folder}/${Date.now()}-${file.originalname}`;

    // Multer may store file in memory (buffer) or on disk (path). Prefer buffer, fallback to stream.
    const body =
      file.buffer ?? (file.path ? createReadStream(file.path) : undefined);
    if (!body) throw new BadRequestException('File buffer is not available');

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ACL: 'public-read',
        ContentType: file.mimetype ?? 'application/octet-stream',
      }),
    );

    // URL chuẩn public-read
    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return { key, url };
  }

  /** Upload nhiều file */
  async uploadMulti(files: MulterFile[], folder: string) {
    if (!files || files.length === 0)
      throw new BadRequestException('No files provided');

    const tasks = files.map((file) => this.uploadSingle(file, folder));
    return Promise.all(tasks);
  }
}
