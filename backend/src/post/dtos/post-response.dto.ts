import { ApiProperty } from '@nestjs/swagger';

export class PostAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class CommentPreviewDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  author: PostAuthorDto;
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  channelId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  author: PostAuthorDto;
}

export class PostDetailResponseDto extends PostResponseDto {
  @ApiProperty({ 
    type: [CommentPreviewDto],
    description: '1-3 preview comments' 
  })
  previewComments: CommentPreviewDto[];

  @ApiProperty({ description: 'Total number of comments' })
  totalComments: number;
}

export class PostListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  author: PostAuthorDto;

  @ApiProperty({ description: 'Total number of comments' })
  commentCount: number;
}

