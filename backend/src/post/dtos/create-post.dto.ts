import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ 
    example: 'This is my first post in this channel!',
    description: 'Content of the post'
  })
  content: string;
}

