import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ROLES } from '../../common/constants/roles.constant';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: [ROLES.WORKSPACE_MEMBER, ROLES.WORKSPACE_PRIVILEGE_MEMBER, ROLES.WORKSPACE_ADMIN] })
  @IsEnum([ROLES.WORKSPACE_MEMBER, ROLES.WORKSPACE_PRIVILEGE_MEMBER, ROLES.WORKSPACE_ADMIN])
  @IsNotEmpty()
  role: string;
}
