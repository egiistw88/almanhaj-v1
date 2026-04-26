import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Uses dummy values until user configures environment variables securely
// WARNING: To enable real database syncing, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
