import { IsOptional, IsString } from 'class-validator';

export class StartMeetingDto {
  @IsOptional()
  @IsString()
  title?: string;
}
