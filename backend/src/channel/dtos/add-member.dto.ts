import { IsString, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddChannelMemberDto {
  @ValidateIf(o => !o.userId)
  @IsEmail()
  @ApiProperty({ 
    example: 'user@example.com', 
    required: false,
    description: 'Email của user cần thêm vào channel. Ít nhất một trong hai trường email hoặc userId là bắt buộc.'
  })
  email?: string;

  @ValidateIf(o => !o.email)
  @IsString()
  @ApiProperty({ 
    example: 'user-uuid-here', 
    required: false,
    description: 'ID của user cần thêm vào channel. Ít nhất một trong hai trường email hoặc userId là bắt buộc.'
  })
  userId?: string;
}

