import { ApiProperty } from '@nestjs/swagger';

export class UserResponseBaseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string | null;
}

export class UserResponseFullDto extends UserResponseBaseDto {
  @ApiProperty()
  gender: string;

  @ApiProperty()
  dateOfBirth: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
