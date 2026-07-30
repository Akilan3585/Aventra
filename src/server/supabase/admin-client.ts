import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export function isSupabaseAdminConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  return Boolean(
    url && secretKey && !url.includes("your-project-ref") && !secretKey.includes("REPLACE_ME"),
  );
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey || !isSupabaseAdminConfigured()) {
    throw new Error(
      "Supabase administration is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
