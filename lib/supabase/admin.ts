import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged server-only Supabase client using the service_role key.
 * NEVER import this from code that ships to the browser.
 * Use only from Route Handlers / Server Actions / server-side scripts.
 *
 * Bypasses RLS — handle with care.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
