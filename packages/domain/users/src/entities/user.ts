export interface User {
  id?: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export type MemberRole = 'owner' | 'editor' | 'viewer';