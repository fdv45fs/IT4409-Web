import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceModule } from './workspace/workspace.module';
import { UploadModule } from './upload/upload.module';
import { ChannelModule } from './channel/channel.module';
import { MeetingModule } from './meeting/meeting.module';
import { PostModule } from './post/post.module';
import { CommentModule } from './comment/comment.module';
import { MaterialModule } from './material/material.module';
import { ChatModule } from './chat/chat.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WorkspaceModule,
    UploadModule,
    ChannelModule,
    MeetingModule,
    PostModule,
    CommentModule,
    MaterialModule,
    ChatModule,
  ],
})
export class AppModule {}
