export class WorkspaceMemberResponseDto {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  joinedAt: Date;
}

export class WorkspaceMemberListResponseDto {
  members: WorkspaceMemberResponseDto[];
  totalCount: number;
  myRole: string;
}
