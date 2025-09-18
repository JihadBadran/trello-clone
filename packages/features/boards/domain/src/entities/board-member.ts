import { Database } from "@tc/infra/supabase";


export interface BoardMember {
  board_id: string;
  userId: string;
  role: Database['public']['Tables']['board_members']['Row']['role'];
  updatedAt: string;
}