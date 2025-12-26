import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { StartMeetingDto } from './dtos/start-meeting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES } from '../common/constants/roles.constant';
import { Public } from '../common/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  /** START */
  @UseGuards(RolesGuard)
  @Roles(ROLES.CHANNEL_ADMIN)
  @Post('start')
  startMeeting(
    @Req() req,
    @Param('channelId') channelId: string,
    @Body() dto: StartMeetingDto,
  ) {
    return this.meetingService.startMeeting(channelId, req.user.id, dto);
  }

  /** JOIN - returns both roomUrl and Daily token */
  @UseGuards(RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  @Post('join')
  join(@Req() req, @Param('channelId') channelId: string) {
    return this.meetingService.joinMeeting(channelId, req.user.id);
  }

  /** GET JOIN TOKEN (deprecated - use POST /join instead) */
  @UseGuards(RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  @Get('token')
  getToken(@Req() req, @Param('channelId') channelId: string) {
    return this.meetingService.getJoinToken(channelId, req.user.id);
  }

  /** LEAVE */
  @UseGuards(RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  @Post('leave')
  leave(@Req() req, @Param('channelId') channelId: string) {
    return this.meetingService.leaveMeeting(channelId, req.user.id);
  }

  /** END */
  @UseGuards(RolesGuard)
  @Roles(ROLES.CHANNEL_ADMIN)
  @Patch('end')
  end(@Req() req, @Param('channelId') channelId: string) {
    return this.meetingService.endMeeting(channelId, req.user.id);
  }

  /** GET current meeting */
  @UseGuards(RolesGuard)
  @Roles(ROLES.CHANNEL_MEMBER, ROLES.CHANNEL_ADMIN)
  @Get()
  get(@Param('channelId') channelId: string) {
    return this.meetingService.getMeeting(channelId);
  }

  @Public()
  @Post('/daily/webhook')
  async dailyWebhook(@Body() body) {
    const event = body.event;

    if (event === 'participant-left') {
      const roomName = body?.payload?.room?.name;
      const userId = body?.payload?.participant?.user_id;

      if (roomName && userId) {
        await this.meetingService.forceLeave(roomName, userId);
      }
    }

    return { status: 'ok' };
  }
}
