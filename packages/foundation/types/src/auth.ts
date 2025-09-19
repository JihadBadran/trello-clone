import { Database } from "@tc/infra/supabase";
export type Profile = Database['public']['Tables']['profiles']['Row'];
