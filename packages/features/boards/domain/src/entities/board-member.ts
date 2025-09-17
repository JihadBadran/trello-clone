import { Database } from "@tc/infra/supabase";


export interface BoardMember {
  boardId: string;
  userId: string;
  role: Database['public']['Tables']['board_members']['Row']['role'];
  updatedAt: string;
}