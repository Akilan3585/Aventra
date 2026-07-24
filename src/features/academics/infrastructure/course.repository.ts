import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type Course = Database["public"]["Tables"]["courses"]["Row"];

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("courses")
    .select("*")
    .order("code");

  if (error) throw new DatabaseQueryError("list courses", error.message);

  return data;
}
