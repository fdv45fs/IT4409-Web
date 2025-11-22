import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PromoteMemberDto {
  @IsString()
  @IsIn(['CHANNEL_ADMIN', 'CHANNEL_MEMBER'])
  @ApiProperty({ 
    example: 'CHANNEL_ADMIN',
    enum: ['CHANNEL_ADMIN', 'CHANNEL_MEMBER'],
    description: 'Role mới cho member: CHANNEL_ADMIN (promote) hoặc CHANNEL_MEMBER (demote)'
  })
  newRole: 'CHANNEL_ADMIN' | 'CHANNEL_MEMBER';
}


