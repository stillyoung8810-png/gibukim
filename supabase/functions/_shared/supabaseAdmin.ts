import { createClient } from "npm:@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl == null || supabaseUrl === "") {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (serviceRoleKey == null || serviceRoleKey === "") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
