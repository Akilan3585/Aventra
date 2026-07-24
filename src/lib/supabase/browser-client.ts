"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { getSupabasePublicConfig } from "./config";

export function createBrowserSupabaseClient() {
  const { publishableKey, url } = getSupabasePublicConfig();

  return createClient<Database>(url, publishableKey);
}
