"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { enrollStudentInClasses } from "@/features/students/application/student-enrollment.service";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

const schema = z.object({ studentId: z.guid() });

/** Admin repair action: place an already-accepted student into every class of their department. */
export async function enrollStudentInDepartmentClassesAction(formData: FormData) {
  const access = await requirePermission("students:manage");
  const parsed = schema.safeParse({ studentId: formData.get("studentId") });
  if (!parsed.success) return;
  const { data: student } = await createSupabaseAdminClient()
    .from("students")
    .select("id, department_id, profiles (membership_status)")
    .eq("id", parsed.data.studentId)
    .maybeSingle();
  if (!student || student.profiles?.membership_status !== "active") return;
  await enrollStudentInClasses({
    actorProfileId: access.profileId,
    departmentId: student.department_id,
    facultyId: null,
    source: "students.enroll_department",
    studentId: student.id,
  });
  for (const path of ["/students", "/student-workspace", "/assignments", "/courses"]) revalidatePath(path);
}
