import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import type { Database } from "@/types/database";

export type AttendanceRecord =
  Database["public"]["Tables"]["attendance_records"]["Row"];

export async function listAttendanceForStudent(
  studentId: string,
): Promise<AttendanceRecord[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("attendance_records")
    .select("*")
    .eq("student_id", studentId)
    .order("session_date", { ascending: false })
    .order("session");

  if (error) throw new DatabaseQueryError("list attendance", error.message);

  return data;
}
