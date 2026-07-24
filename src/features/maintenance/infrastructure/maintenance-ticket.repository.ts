import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type MaintenanceTicket =
  Database["public"]["Tables"]["maintenance_tickets"]["Row"];

export async function listOpenMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("maintenance_tickets")
    .select("*")
    .in("status", ["open", "assigned", "in_progress"])
    .order("opened_at");

  if (error) throw new DatabaseQueryError("list open maintenance tickets", error.message);

  return data;
}
