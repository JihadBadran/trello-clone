import { Database } from "@tc/infra/supabase";
export type Card = Database["public"]["Tables"]["cards"]["Row"]