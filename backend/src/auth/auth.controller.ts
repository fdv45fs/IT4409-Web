import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUserResponseDto } from '../user/dtos/auth-response.dto';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiResponse, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private readonly COOKIE_NAME = 'refreshToken';
  private readonly COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: this.COOKIE_MAX_AGE,
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(this.COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
    });
  }

  @Post('register')
  @Public()
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: AuthUserResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.register(dto);

    this.setRefreshCookie(res, refreshToken);

    return { accessToken, user };
  }

  @Post('login')
  @Public()
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthUserResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(dto);

    this.setRefreshCookie(res, refreshToken);

    return { accessToken, user };
  }

  @Post('refresh-token')
  @Public()
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[this.COOKIE_NAME];
    if (!refreshToken) throw new BadRequestException('No refresh token cookie');

    const { accessToken, newRefreshToken } =
      await this.authService.refresh(refreshToken);

    this.setRefreshCookie(res, newRefreshToken);

    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const userId = req.user.id;
    await this.authService.logout(userId);
    this.clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi link reset mật khẩu qua email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Email chứa link reset password đã được gửi' 
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu với token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mật khẩu đã được đặt lại thành công' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Token không hợp lệ hoặc đã hết hạn' 
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
