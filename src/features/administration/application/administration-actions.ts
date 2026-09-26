"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveActorProfileId } from "@/features/administration/infrastructure/administration.repository";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AdministrationActionState = { message: string; status: "idle" | "error" | "success" };

function failed(message: string): AdministrationActionState { return { message, status: "error" }; }
function succeeded(message: string): AdministrationActionState { return { message, status: "success" }; }

async function audit(userId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, string | number | boolean | null> = {}) {
  const client = createSupabaseAdminClient();
  await client.from("audit_logs").insert({
    action,
    actor_profile_id: await resolveActorProfileId(userId),
    entity_id: entityId,
    entity_type: entityType,
    metadata: { ...metadata, actor_clerk_id: userId },
  });
}

function refresh(...paths: string[]) {
  [...paths, "/dashboard", "/analytics"].forEach((path) => revalidatePath(path));
}

const departmentSchema = z.object({ code: z.string().trim().min(2).max(12).transform((value) => value.toUpperCase()), name: z.string().trim().min(3).max(120) });
export async function createDepartmentAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = departmentSchema.safeParse({ code: formData.get("code"), name: formData.get("name") });
    if (!parsed.success) return failed("Enter a 2–12 character code and a valid department name.");
    const { data, error } = await createSupabaseAdminClient().from("departments").insert(parsed.data).select("id").single();
    if (error) return failed(error.code === "23505" ? "That department code or name already exists." : "Department could not be created.");
    await audit(access.userId, "department.created", "department", data.id, { code: parsed.data.code });
    refresh("/courses");
    return succeeded("Department created and audit history recorded.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const courseSchema = z.object({ code: z.string().trim().min(2).max(16).transform((value) => value.toUpperCase()), creditHours: z.coerce.number().positive().max(12), departmentId: z.guid(), title: z.string().trim().min(3).max(160) });
export async function createCourseAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = courseSchema.safeParse({ code: formData.get("code"), creditHours: formData.get("creditHours"), departmentId: formData.get("departmentId"), title: formData.get("title") });
    if (!parsed.success) return failed("Complete the course code, title, department, and credit hours.");
    const { data, error } = await createSupabaseAdminClient().from("courses").insert({ code: parsed.data.code, credit_hours: parsed.data.creditHours, department_id: parsed.data.departmentId, title: parsed.data.title }).select("id").single();
    if (error) return failed(error.code === "23505" ? "That course code already exists." : "Course could not be created.");
    await audit(access.userId, "course.created", "course", data.id, { code: parsed.data.code });
    refresh("/courses");
    return succeeded("Course added to the governed catalog.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const offeringSchema = z.object({ academicYear: z.coerce.number().int().min(2000).max(2200), capacity: z.coerce.number().int().positive().max(1000), courseId: z.guid(), facultyId: z.union([z.guid(), z.literal("")]), section: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()), term: z.enum(["spring", "summer", "fall", "winter"]) });
export async function createOfferingAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = offeringSchema.safeParse({ academicYear: formData.get("academicYear"), capacity: formData.get("capacity"), courseId: formData.get("courseId"), facultyId: formData.get("facultyId") ?? "", section: formData.get("section"), term: formData.get("term") });
    if (!parsed.success) return failed("Complete the course offering details.");
    const { data, error } = await createSupabaseAdminClient().from("course_offerings").insert({ academic_year: parsed.data.academicYear, capacity: parsed.data.capacity, course_id: parsed.data.courseId, faculty_id: parsed.data.facultyId || null, section: parsed.data.section, term: parsed.data.term }).select("id").single();
    if (error) return failed(error.code === "23505" ? "That section already exists for this term." : "Offering could not be created.");
    await audit(access.userId, "course_offering.created", "course_offering", data.id, { term: parsed.data.term, year: parsed.data.academicYear });
    refresh("/courses");
    return succeeded("Course offering created and ready for scheduling.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const resultSchema = z.object({ academicYear: z.coerce.number().int().min(2000).max(2200), cgpa: z.coerce.number().min(0).max(10), gpa: z.coerce.number().min(0).max(10), publish: z.boolean(), semester: z.coerce.number().int().min(1).max(16), studentId: z.guid(), term: z.enum(["spring", "summer", "fall", "winter"]) });
export async function publishResultAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = resultSchema.safeParse({ academicYear: formData.get("academicYear"), cgpa: formData.get("cgpa"), gpa: formData.get("gpa"), publish: formData.get("publish") === "on", semester: formData.get("semester"), studentId: formData.get("studentId"), term: formData.get("term") });
    if (!parsed.success) return failed("Complete the student, term, semester, GPA, and CGPA fields.");
    const client = createSupabaseAdminClient();
    const { data, error } = await client.from("semester_results").upsert({ academic_year: parsed.data.academicYear, cgpa: parsed.data.cgpa, gpa: parsed.data.gpa, published_at: parsed.data.publish ? new Date().toISOString() : null, semester: parsed.data.semester, student_id: parsed.data.studentId, term: parsed.data.term }, { onConflict: "student_id,academic_year,term" }).select("id").single();
    if (error) return failed("Academic result could not be saved.");
    await audit(access.userId, parsed.data.publish ? "semester_result.published" : "semester_result.saved", "semester_result", data.id, { gpa: parsed.data.gpa, term: parsed.data.term });
    refresh("/performance", "/students");
    return succeeded(parsed.data.publish ? "Result published with an immutable audit event." : "Result saved as an unpublished record.");
  } catch { return failed("Sign in with campus-management permission."); }
}

export async function markNotificationReadAction(formData: FormData) {
  const access = await requirePermission("workspace:access");
  const notificationId = z.guid().safeParse(formData.get("notificationId"));
  if (!notificationId.success) return;
  const profileId = await resolveActorProfileId(access.userId);
  if (!profileId) return;
  await createSupabaseAdminClient().from("notifications").update({ read_at: new Date().toISOString(), status: "read" }).eq("id", notificationId.data).eq("recipient_profile_id", profileId);
  revalidatePath("/notifications");
}

const profileSchema = z.object({ displayName: z.string().trim().min(2).max(120) });
export async function updateProfileAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("workspace:access");
    const parsed = profileSchema.safeParse({ displayName: formData.get("displayName") });
    if (!parsed.success) return failed("Enter a valid display name.");
    const profileId = await resolveActorProfileId(access.userId);
    if (!profileId) return failed("Your Clerk account has not been synchronized to a campus profile yet.");
    const { error } = await createSupabaseAdminClient().from("profiles").update({ display_name: parsed.data.displayName }).eq("id", profileId);
    if (error) return failed("Profile could not be updated.");
    await audit(access.userId, "profile.updated", "profile", profileId);
    revalidatePath("/profile");
    return succeeded("Campus profile updated.");
  } catch { return failed("Sign in to update your profile."); }
}
