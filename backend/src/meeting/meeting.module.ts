import { Module } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';

@Module({
  providers: [MeetingService],
  controllers: [MeetingController]
})
export class MeetingModule {}
