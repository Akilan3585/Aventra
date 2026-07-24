import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type FacultyMember = Database["public"]["Tables"]["faculty_members"]["Row"];

export async function listFacultyMembers(): Promise<FacultyMember[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("faculty_members")
    .select("*")
    .order("employee_number");

  if (error) throw new DatabaseQueryError("list faculty members", error.message);

  return data;
}
