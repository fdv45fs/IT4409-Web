import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class MeetingService {
  constructor(private prisma: PrismaService) {}

  /** Daily API wrapper */
  private async createDailyRoom(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }
    try {
      const res = await axios.post(
        'https://api.daily.co/v1/rooms',
        {
          // NOTE: roomName Daily trả về bên dưới res.data.name
          name: `channel-${channel.name}`,
          properties: {
            exp: Math.floor(Date.now() / 1000) + 3600, // expire in 1h
          },
        },
        {
          headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
        },
      );

      // Daily may return `name` or `id` depending on API; prefer name then fallback to id
      const roomName = res.data?.name ?? res.data?.id;
      if (!roomName) {
        throw new BadRequestException(
          'Daily API responded without room name/id',
        );
      }

      return {
        roomUrl: res.data.url,
        roomName,
      };
    } catch (err) {
      // Normalize axios error to a readable message for debugging
      const msg =
        err?.response?.data || err?.message || 'Unknown error from Daily API';
      throw new BadRequestException(
        `Failed to create Daily room: ${JSON.stringify(msg)}`,
      );
    }
  }

  /** START MEETING ------------------------------- */
  async startMeeting(
    channelId: string,
    userId: string,
    dto: { title?: string },
  ) {
    // verify channel exists
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new BadRequestException('Channel not found');

    // ensure no active meeting
    const existing = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
    });
    if (existing) throw new BadRequestException('Meeting already active');

    // create Daily room
    const room = await this.createDailyRoom(channelId);

    // create meeting record
    const meeting = await this.prisma.channelMeeting.create({
      data: {
        channelId,
        hostId: userId,
        title: dto.title,
        roomUrl: room.roomUrl,
        roomName: room.roomName, // lưu tên room
        participants: {
          // NOTE: tự động thêm host vào participants
          create: {
            userId,
            joinedAt: new Date(),
          },
        },
      },
      include: {
        participants: true,
      },
    });

    return meeting;
  }

  /** GET ---------------------------------------- */
  async getMeeting(channelId: string) {
    return this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
      include: {
        participants: {
          include: { User: true },
        },
      },
    });
  }

  /** JOIN ---------------------------------------- */
  async joinMeeting(channelId: string, userId: string) {
    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
    });
    if (!meeting) throw new BadRequestException('No active meeting');

    const existing = await this.prisma.channelMeetingParticipant.findFirst({
      where: { meetingId: meeting.id, userId },
    });

    if (existing) {
      if (existing.leftAt) {
        await this.prisma.channelMeetingParticipant.update({
          where: { id: existing.id },
          data: { leftAt: null, joinedAt: new Date() },
        });
      }
    } else {
      await this.prisma.channelMeetingParticipant.create({
        data: { meetingId: meeting.id, userId },
      });
    }

    return { roomUrl: meeting.roomUrl };
  }

  /** GET JOIN TOKEN ---------------------------------------- */
  async getJoinToken(channelId: string, userId: string) {
    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
    });
    if (!meeting) throw new BadRequestException('No active meeting');

    // check participant
    const participant = await this.prisma.channelMeetingParticipant.findFirst({
      where: { meetingId: meeting.id, userId },
    });
    if (!participant)
      throw new ForbiddenException('You must join the meeting first');

    // lấy fullName user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const isOwner = meeting.hostId === userId;

    try {
      if (!meeting.roomName)
        throw new BadRequestException('Meeting has no roomName recorded');

      const res = await axios.post(
        'https://api.daily.co/v1/meeting-tokens',
        {
          properties: {
            room_name: meeting.roomName,
            user_name: user.fullName, // <-- sử dụng fullName
            is_owner: isOwner,
          },
        },
        { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } },
      );

      return {
        token: res.data?.token,
        roomUrl: meeting.roomUrl,
      };
    } catch (err) {
      const msg =
        err?.response?.data || err?.message || 'Unknown error from Daily API';
      throw new BadRequestException(
        `Failed to create meeting token: ${JSON.stringify(msg)}`,
      );
    }
  }

  /** LEAVE -------------------------------------- */
  async leaveMeeting(channelId: string, userId: string) {
    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
    });
    if (!meeting) throw new BadRequestException('No meeting');

    await this.prisma.channelMeetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId, leftAt: null },
      data: { leftAt: new Date() },
    });

    // CHECK: còn ai tham gia không
    const remaining = await this.prisma.channelMeetingParticipant.count({
      where: { meetingId: meeting.id, leftAt: null },
    });

    if (remaining === 0) {
      // tự động end meeting
      await this.prisma.channelMeeting.update({
        where: { id: meeting.id },
        data: { isActive: false, endedAt: new Date() },
      });
    }

    return {
      message: remaining === 0 ? 'Meeting ended automatically' : 'Left meeting',
    };
  }

  /** END ---------------------------------------- */
  async endMeeting(channelId: string, userId: string) {
    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
    });

    if (!meeting) throw new BadRequestException('No active meeting');
    if (meeting.hostId !== userId)
      throw new ForbiddenException('Only host can end meeting');

    // Cập nhật trạng thái meeting
    await this.prisma.channelMeeting.update({
      where: { id: meeting.id },
      data: { isActive: false, endedAt: new Date() },
    });

    // Cập nhật tất cả participant còn active
    await this.prisma.channelMeetingParticipant.updateMany({
      where: { meetingId: meeting.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    return { message: 'Meeting ended' };
  }

  /** FORCE LEAVE (for webhook) ------------------ */
  async forceLeave(roomName: string, userId: string) {
    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { roomName, isActive: true },
    });
    if (!meeting) return;

    await this.prisma.channelMeetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId, leftAt: null },
      data: { leftAt: new Date() },
    });

    const remaining = await this.prisma.channelMeetingParticipant.count({
      where: { meetingId: meeting.id, leftAt: null },
    });

    if (remaining === 0) {
      await this.prisma.channelMeeting.update({
        where: { id: meeting.id },
        data: { isActive: false, endedAt: new Date() },
      });
    }
  }
}
