import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type AttendanceRecord =
  Database["public"]["Tables"]["attendance_records"]["Row"];

export async function listAttendanceForEnrollment(
  enrollmentId: string,
): Promise<AttendanceRecord[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("attendance_records")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("session_date", { ascending: false });

  if (error) throw new DatabaseQueryError("list attendance", error.message);

  return data;
}
