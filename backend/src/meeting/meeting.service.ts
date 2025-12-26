import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { Logger } from '@nestjs/common';

// Daily API response types
interface DailyRoomResponse {
  name?: string;
  id?: string;
  url: string;
}

interface DailyTokenResponse {
  token: string;
}

@Injectable()
export class MeetingService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(MeetingService.name);

  /** Delete Daily room by name (best-effort, don't fail main flow) */
  private async deleteDailyRoom(roomName?: string | null) {
    if (!roomName) return;
    try {
      await axios.delete(
        `https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}`,
        { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } },
      );
      this.logger.log(`Deleted Daily room: ${roomName}`);
    } catch (err) {
      const msg = err?.response?.data || err?.message || 'Unknown error';
      this.logger.warn(
        `Failed to delete Daily room ${roomName}: ${JSON.stringify(msg)}`,
      );
    }
  }

  /** Daily API wrapper */
  private async createDailyRoom(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }
    try {
      const res = await axios.post<DailyRoomResponse>(
        'https://api.daily.co/v1/rooms',
        {
          // NOTE: roomName Daily trả về bên dưới res.data.name
          name: `channel-${channel.name}-${Date.now()}`,
          privacy: 'private', // CRITICAL: Require token to join - URL alone won't work
          properties: {
            exp: Math.floor(Date.now() / 1000) + 600, // expire in 10 minutes
            enable_knocking: false, // No knocking, must have valid token
            enable_screenshare: true,
            enable_chat: false, // Use our own chat system
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
    const room = await this.createDailyRoom(channelId);
    // Use transaction to ensure atomic check-and-create
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // ensure no active meeting inside transaction
        const existing = await tx.channelMeeting.findFirst({
          where: { channelId, isActive: true },
        });
        if (existing) throw new BadRequestException('Meeting already active');
        // create meeting record
        return await tx.channelMeeting.create({
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
      });
      return result;
    } catch (err) {
      // Handle unique constraint violation (if schema is updated accordingly)
      if (
        err instanceof BadRequestException ||
        (err.code === 'P2002' && err.meta?.target?.includes('channelId'))
      ) {
        throw new BadRequestException('Meeting already active');
      }
      throw err;
    }
  }

  /** GET ---------------------------------------- */
  async getMeeting(channelId: string) {
    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
      include: {
        participants: {
          include: {
            User: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) return null;

    // Remove sensitive fields (roomUrl, roomName) from response
    const { roomUrl, roomName, ...safeMeeting } = meeting;
    return safeMeeting;
  }

  /** JOIN ---------------------------------------- */
  async joinMeeting(channelId: string, userId: string) {
    // Verify channel membership first
    const channelMember = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      include: { role: true },
    });
    if (!channelMember)
      throw new ForbiddenException('You are not a member of the channel');

    const meeting = await this.prisma.channelMeeting.findFirst({
      where: { channelId, isActive: true },
    });
    if (!meeting) throw new BadRequestException('No active meeting');

    // Update/create participant record
    const existing = await this.prisma.channelMeetingParticipant.findFirst({
      where: { meetingId: meeting.id, userId },
    });

    if (existing) {
      if (existing.leftAt) {
        await this.prisma.channelMeetingParticipant.update({
          where: { id: existing.id },
          data: { leftAt: null },
        });
      }
    } else {
      await this.prisma.channelMeetingParticipant.create({
        data: { meetingId: meeting.id, userId },
      });
    }

    // Get user info
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // Determine if user is owner
    const isOwner = channelMember.role.name === 'CHANNEL_ADMIN';

    // Create Daily token
    try {
      if (!meeting.roomName)
        throw new BadRequestException('Meeting has no roomName recorded');

      // Token expires in 10 minutes for security
      const tokenExpiry = Math.floor(Date.now() / 1000) + 600;

      const res = await axios.post<DailyTokenResponse>(
        'https://api.daily.co/v1/meeting-tokens',
        {
          properties: {
            room_name: meeting.roomName,
            user_name: user.fullName,
            user_id: userId, // Bind token to specific user
            is_owner: isOwner,
            exp: tokenExpiry, // Token expires in 10 minutes
          },
        },
        { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } },
      );

      // Return token and roomUrl (URL needed by Daily SDK, but token is required)
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

  /** GET JOIN TOKEN (deprecated - use joinMeeting instead) ---------------------------------------- */
  async getJoinToken(channelId: string, userId: string) {
    // For backward compatibility, verify participant exists first
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

    // Lấy role của user trong channel
    const channelMember = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      include: { role: true },
    });
    if (!channelMember)
      throw new ForbiddenException('You are not a member of the channel');
    const isOwner = channelMember.role.name === 'CHANNEL_ADMIN';

    // Tạo token từ Daily API
    try {
      if (!meeting.roomName)
        throw new BadRequestException('Meeting has no roomName recorded');

      // Token expires in 10 minutes for security
      const tokenExpiry = Math.floor(Date.now() / 1000) + 600;

      const res = await axios.post<DailyTokenResponse>(
        'https://api.daily.co/v1/meeting-tokens',
        {
          properties: {
            room_name: meeting.roomName,
            user_name: user.fullName,
            user_id: userId,
            is_owner: isOwner,
            exp: tokenExpiry,
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

      // Best-effort: delete the Daily room to avoid resource accumulation
      try {
        await this.deleteDailyRoom(meeting.roomName);
      } catch (err) {
        // deleteDailyRoom logs failures; continue
      }
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

    // Best-effort: delete the Daily room when host ends the meeting
    try {
      await this.deleteDailyRoom(meeting.roomName);
    } catch (err) {
      // already logged inside deleteDailyRoom
    }

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

      // Best-effort: delete the Daily room when webhook forces meeting end
      try {
        await this.deleteDailyRoom(meeting.roomName);
      } catch (err) {
        // deletion is best-effort; log already handled in helper
      }
    }
  }
}
