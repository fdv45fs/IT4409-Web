import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123456' })
  token: string;

  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'newPassword123', minLength: 6 })
  newPassword: string;
}

