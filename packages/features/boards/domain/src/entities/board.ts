import { Database } from '@tc/infra/supabase';
export type Board = Database['public']['Tables']['boards']['Row'];
