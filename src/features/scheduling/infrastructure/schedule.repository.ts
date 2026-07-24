import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];

export async function listSchedulesForRoom(roomId: string): Promise<Schedule[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("schedules")
    .select("*")
    .eq("room_id", roomId)
    .order("starts_at");

  if (error) throw new DatabaseQueryError("list room schedules", error.message);

  return data;
}
