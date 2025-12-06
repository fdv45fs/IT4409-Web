import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ 
    example: 'Great post! Thanks for sharing.',
    description: 'Content of the comment'
  })
  content: string;
}

