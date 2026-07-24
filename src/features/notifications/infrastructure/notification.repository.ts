import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export async function listNotificationsForProfile(
  profileId: string,
): Promise<Notification[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("notifications")
    .select("*")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw new DatabaseQueryError("list notifications", error.message);

  return data;
}
