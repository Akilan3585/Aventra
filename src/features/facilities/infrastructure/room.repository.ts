import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type Room = Database["public"]["Tables"]["rooms"]["Row"];

export async function listActiveRooms(): Promise<Room[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("rooms")
    .select("*")
    .eq("is_active", true)
    .order("building")
    .order("code");

  if (error) throw new DatabaseQueryError("list active rooms", error.message);

  return data;
}
