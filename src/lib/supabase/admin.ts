import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * Cliente administrativo (service role). Solo en servidor: cron y callbacks
 * OAuth. Omite RLS; nunca debe exponerse al navegador ni a respuestas JSON.
 */
export function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
