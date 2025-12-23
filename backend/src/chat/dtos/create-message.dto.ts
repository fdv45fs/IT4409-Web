import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn',
    example: 'Xin chào mọi người!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(5000, { message: 'Nội dung tin nhắn tối đa 5000 ký tự' })
  content: string;

  @ApiPropertyOptional({
    description: 'ID tin nhắn đang reply (nếu có)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'replyToId phải là UUID hợp lệ' })
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách userId được mention trong tin nhắn',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Mỗi mentionedUserIds phải là UUID hợp lệ' })
  mentionedUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách URLs của file đính kèm',
    example: ['https://example.com/file1.pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

