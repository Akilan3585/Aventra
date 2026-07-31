"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

const currentYear = new Date().getFullYear();
const createStudentSchema = z.object({
  admissionYear: z.coerce.number().int().min(2000).max(currentYear + 1),
  departmentId: z.uuid(),
  displayName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  semester: z.coerce.number().int().min(1).max(16),
  studentNumber: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9/_-]+$/),
});

export type CreateStudentState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialCreateStudentState: CreateStudentState = {
  message: "",
  status: "idle",
};

export async function createStudentAction(
  _previousState: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  try {
    const access = await requirePermission("students:manage");
    const parsed = createStudentSchema.safeParse({
      admissionYear: formData.get("admissionYear"),
      departmentId: formData.get("departmentId"),
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      semester: formData.get("semester"),
      studentNumber: formData.get("studentNumber"),
    });

    if (!parsed.success) {
      return { message: parsed.error.issues[0]?.message ?? "Check the form fields.", status: "error" };
    }

    const client = createSupabaseAdminClient();
    const pendingProfileId = `pending:${crypto.randomUUID()}`;
    const { error: profileError } = await client.from("profiles").insert({
      campus_role: "student",
      display_name: parsed.data.displayName,
      email: parsed.data.email,
      id: pendingProfileId,
    });

    if (profileError) {
      return { message: profileError.code === "23505" ? "That student email already exists." : "Could not create the student profile.", status: "error" };
    }

    const { data: student, error: studentError } = await client
      .from("students")
      .insert({
        admission_year: parsed.data.admissionYear,
        department_id: parsed.data.departmentId,
        profile_id: pendingProfileId,
        semester: parsed.data.semester,
        student_number: parsed.data.studentNumber.toUpperCase(),
      })
      .select("id")
      .single();

    if (studentError) {
      await client.from("profiles").delete().eq("id", pendingProfileId);
      return { message: studentError.code === "23505" ? "That student number already exists." : "Could not create the student record.", status: "error" };
    }

    await client.from("audit_logs").insert({
      action: "student.created",
      actor_profile_id: null,
      entity_id: student.id,
      entity_type: "student",
      metadata: { actor_clerk_id: access.userId, student_number: parsed.data.studentNumber.toUpperCase() },
    });

    revalidatePath("/students");
    return { message: "Student added to the roster.", status: "success" };
  } catch (error) {
    const message = error instanceof Error && error.message === "PERMISSION_DENIED"
      ? "You do not have permission to manage students."
      : "Sign in with an authorized campus account to continue.";
    return { message, status: "error" };
  }
}
