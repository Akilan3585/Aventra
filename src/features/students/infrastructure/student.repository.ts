import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type Student = Database["public"]["Tables"]["students"]["Row"];

export async function listStudents(): Promise<Student[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("students")
    .select("*")
    .order("student_number");

  if (error) throw new DatabaseQueryError("list students", error.message);

  return data;
}
