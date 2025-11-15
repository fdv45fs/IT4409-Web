import { ApiProperty } from '@nestjs/swagger';
import { UserResponseBaseDto } from './user-response.dto';

export class AuthUserResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: UserResponseBaseDto })
  user: UserResponseBaseDto;
}
