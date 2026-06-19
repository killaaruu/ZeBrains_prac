import { SupabaseAuthService } from "@repo/services-client/auth";
import { SupabaseRealtimeService } from "@repo/services-client/realtime";
import { createClient } from "@supabase/supabase-js";
import { apiClient } from "./api-client";
import { LocalDevAuthService } from "./local-dev-auth-service";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
export const realtimeService = new SupabaseRealtimeService(supabase);

export const authService =
  import.meta.env.VITE_LOCAL_DEV_AUTH_ENABLED === "true"
    ? new LocalDevAuthService(apiClient)
    : new SupabaseAuthService(supabase);
