import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesQueryDto {
  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số tin nhắn mỗi trang',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Cursor ID để lấy tin nhắn cũ hơn (pagination cursor)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  beforeId?: string;

  @ApiPropertyOptional({
    description: 'Cursor ID để lấy tin nhắn mới hơn',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  afterId?: string;
}

