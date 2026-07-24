import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type SemesterResult =
  Database["public"]["Tables"]["semester_results"]["Row"];

export async function listSemesterResultsForStudent(
  studentId: string,
): Promise<SemesterResult[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("semester_results")
    .select("*")
    .eq("student_id", studentId)
    .order("academic_year", { ascending: false })
    .order("semester", { ascending: false });

  if (error) throw new DatabaseQueryError("list semester results", error.message);

  return data;
}
