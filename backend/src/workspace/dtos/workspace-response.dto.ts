import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ description: 'Số lượng thành viên trong workspace' })
  memberCount: number;

  @ApiProperty({ description: 'Role của user hiện tại trong workspace' })
  myRole: string;
}
