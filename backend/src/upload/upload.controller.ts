import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Param,
  UseGuards,
  Req,
  Inject,
  forwardRef,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MaterialService } from '../material/material.service';
import { ChatService } from '../chat/chat.service';
import { PostService } from '../post/post.service';
import { CommentService } from '../comment/comment.service';
import type { File as MulterFile } from 'multer';
import type { Response } from 'express';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => MaterialService))
    private readonly materialService: MaterialService,
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => PostService))
    private readonly postService: PostService,
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) { }

  /**
   * Force download an attachment via backend (avoids S3/browser inline rendering quirks).
   */
  @UseGuards(JwtAuthGuard)
  @Get('attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const fileUrl = await this.chatService.getAttachmentUrlForUser(
      req.user.id,
      attachmentId,
    );

    const { key, result } = await this.uploadService.getObjectByUrl(fileUrl);

    const fileName = decodeURIComponent(key.split('/').pop() || 'file');
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName.replace(/\"/g, '')}"; filename*=UTF-8''${encodedFileName}`,
    );
    res.setHeader(
      'Content-Type',
      result.ContentType || 'application/octet-stream',
    );

    // @aws-sdk/client-s3 returns Body as a stream
    const body: any = result.Body;
    if (!body || typeof body.pipe !== 'function') {
      res.status(500).send('Unable to stream file');
      return;
    }

    body.pipe(res);
  }

  /**
   * Stream a material file (channel materials) via backend to preserve auth and avoid CORS/issues.
   */
  @UseGuards(JwtAuthGuard)
  @Get('channels/:channelId/materials/files/:fileId/download')
  async downloadMaterialFile(
    @Param('channelId') channelId: string,
    @Param('fileId') fileId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Validate file and channel access via MaterialService
    const file = await this.materialService.getFile(channelId, fileId);

    const { key, result } = await this.uploadService.getObjectByUrl(
      file.fileUrl,
    );

    const fileName = decodeURIComponent(key.split('/').pop() || 'file');
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName.replace(/\"/g, '')}"; filename*=UTF-8''${encodedFileName}`,
    );
    res.setHeader('Content-Type', result.ContentType || 'application/octet-stream');

    const body: any = result.Body;
    if (!body || typeof body.pipe !== 'function') {
      res.status(500).send('Unable to stream file');
      return;
    }

    body.pipe(res);
  }

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
    @Req() req: any,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    const uploadResults = await this.uploadService.uploadMulti(
      files,
      `channel/${channelId}/messages/${messageId}`,
    );

    // Register files to Material for channel visibility
    const registerPromises = uploadResults.map((res, idx) =>
      this.materialService.registerChatFile(
        channelId,
        res.url,
        files[idx].originalname,
        req.user.id,
        res.key,
        files[idx].mimetype,
        files[idx].size,
      ),
    );

    await Promise.all(registerPromises);

    // Attach files to the message (FileAttachment)
    const fileUrls = uploadResults.map((res) => res.url);
    const updatedMessage = await this.chatService.addAttachments(messageId, fileUrls);

    return { uploadResults, message: updatedMessage };
  }

  /** ---------------------------
   *  Upload file trong tin nhắn Direct (DM)
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('direct/messages/:messageId/files')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadDirectMessageFiles(
    @UploadedFiles() files: MulterFile[],
    @Param('messageId') messageId: string,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    // Upload to S3 (or local)
    const uploadResults = await this.uploadService.uploadMulti(
      files,
      `direct/messages/${messageId}`,
    );

    // Attach files to the message (FileAttachment)
    const fileUrls = uploadResults.map((res) => res.url);
    const updatedMessage = await this.chatService.addAttachments(
      messageId,
      fileUrls,
    );

    return { uploadResults, message: updatedMessage };
  }

  /** ---------------------------
   *  Upload file cho bài đăng (Post)
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('channel/:channelId/posts/:postId/files')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadPostFiles(
    @UploadedFiles() files: MulterFile[],
    @Param('channelId') channelId: string,
    @Param('postId') postId: string,
    @Req() req: any,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    // Upload to S3
    const uploadResults = await this.uploadService.uploadMulti(
      files,
      `channel/${channelId}/posts/${postId}`,
    );

    // Attach files to the post
    const fileUrls = uploadResults.map((res) => res.url);
    const updatedPost = await this.postService.addAttachments(postId, fileUrls);

    // Register files to Material for channel visibility
    const registerPromises = uploadResults.map((res, idx) =>
      this.materialService.registerChatFile(
        channelId,
        res.url,
        files[idx].originalname,
        req.user.id,
        res.key,
        files[idx].mimetype,
        files[idx].size,
      ),
    );

    await Promise.all(registerPromises);

    return { uploadResults, post: updatedPost };
  }

  /** ---------------------------
   *  Upload file cho bình luận (Comment)
   * --------------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('channel/:channelId/posts/:postId/comments/:commentId/files')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadCommentFiles(
    @UploadedFiles() files: MulterFile[],
    @Param('channelId') channelId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least 1 file required');

    // Upload to S3 - use same folder structure as posts for consistent bucket policy
    const uploadResults = await this.uploadService.uploadMulti(
      files,
      `channel/${channelId}/posts/${postId}`,
    );

    // Attach files to the comment
    const fileUrls = uploadResults.map((res) => res.url);
    const updatedComment = await this.commentService.addAttachments(commentId, fileUrls);

    // Register files to Material for channel visibility
    const registerPromises = uploadResults.map((res, idx) =>
      this.materialService.registerChatFile(
        channelId,
        res.url,
        files[idx].originalname,
        req.user.id,
        res.key,
        files[idx].mimetype,
        files[idx].size,
      ),
    );

    await Promise.all(registerPromises);

    return { uploadResults, comment: updatedComment };
  }
}
