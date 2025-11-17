import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  imports: [UploadModule],
})
export class WorkspaceModule {}
