import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Token không được cung cấp');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'secret_key',
      });

      // Support both 'sub' and 'id' field in JWT payload
      const userId = payload.sub || payload.id;
      if (!userId) {
        throw new WsException('Token không chứa user ID');
      }

      // Lấy thông tin user từ database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        throw new WsException('User không tồn tại');
      }

      // Gắn user vào socket để sử dụng sau
      (client as AuthenticatedSocket).user = user;

      return true;
    } catch (error) {
      throw new WsException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Thử lấy token từ auth header trong handshake
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Thử lấy token từ query params
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (token && typeof token === 'string') {
      return token;
    }

    return undefined;
  }
}

/**
 * Helper function để validate và extract user từ socket
 * Dùng cho các trường hợp không qua Guard
 */
export async function validateSocketToken(
  client: Socket,
  jwtService: JwtService,
  prisma: PrismaService,
): Promise<AuthenticatedSocket['user'] | null> {
  let token: string | undefined;

  // Try multiple ways to extract token
  // 1. From Authorization header
  const authHeader = client.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. From auth object (socket.io auth)
  if (!token && client.handshake.auth?.token) {
    token = client.handshake.auth.token as string;
  }

  // 3. From query params
  if (!token && client.handshake.query?.token) {
    const queryToken = client.handshake.query.token;
    token = Array.isArray(queryToken) ? queryToken[0] : queryToken;
  }

  console.log(
    '[WS Auth] Token found:',
    token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
  );
  console.log('[WS Auth] Auth object:', client.handshake.auth);
  console.log('[WS Auth] Headers auth:', authHeader ? 'present' : 'missing');

  if (!token || typeof token !== 'string') {
    console.log('[WS Auth] No valid token found');
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret_key';
    console.log('[WS Auth] Using secret:', secret.substring(0, 5) + '...');

    const payload = await jwtService.verifyAsync(token, {
      secret,
    });

    // Support both 'sub' and 'id' field in JWT payload
    const userId = payload.sub || payload.id;
    console.log('[WS Auth] Token verified, user ID:', userId);

    if (!userId) {
      console.log('[WS Auth] No user ID in token payload');
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    if (user) {
      console.log('[WS Auth] User found:', user.username);
    } else {
      console.log('[WS Auth] User not found in database');
    }

    return user;
  } catch (error) {
    console.log('[WS Auth] Token verification failed:', error.message);
    return null;
  }
}
