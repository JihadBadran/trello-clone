import type { MemberRole } from '@tc/domain-users';

export interface BoardMember {
  boardId: string;
  userId: string;
  role: MemberRole;
  updatedAt: string;
}