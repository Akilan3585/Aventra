"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveActorProfileId } from "@/features/administration/infrastructure/administration.repository";
import { requirePermission } from "@/server/auth/campus-access";
import { syncClerkCampusAuthorization } from "@/server/auth/clerk-authorization-sync";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { membershipStatuses } from "@/server/auth/campus-access";
import { roles } from "@/server/auth/permissions";

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
    refresh("/departments", "/courses", "/faculty");
    return succeeded("Department created and audit history recorded.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const courseSchema = z.object({ code: z.string().trim().min(2).max(16).transform((value) => value.toUpperCase()), creditHours: z.coerce.number().positive().max(12), departmentId: z.uuid(), title: z.string().trim().min(3).max(160) });
export async function createCourseAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = courseSchema.safeParse({ code: formData.get("code"), creditHours: formData.get("creditHours"), departmentId: formData.get("departmentId"), title: formData.get("title") });
    if (!parsed.success) return failed("Complete the course code, title, department, and credit hours.");
    const { data, error } = await createSupabaseAdminClient().from("courses").insert({ code: parsed.data.code, credit_hours: parsed.data.creditHours, department_id: parsed.data.departmentId, title: parsed.data.title }).select("id").single();
    if (error) return failed(error.code === "23505" ? "That course code already exists." : "Course could not be created.");
    await audit(access.userId, "course.created", "course", data.id, { code: parsed.data.code });
    refresh("/courses", "/schedules");
    return succeeded("Course added to the governed catalog.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const offeringSchema = z.object({ academicYear: z.coerce.number().int().min(2000).max(2200), capacity: z.coerce.number().int().positive().max(1000), courseId: z.uuid(), facultyId: z.union([z.uuid(), z.literal("")]), section: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()), term: z.enum(["spring", "summer", "fall", "winter"]) });
export async function createOfferingAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = offeringSchema.safeParse({ academicYear: formData.get("academicYear"), capacity: formData.get("capacity"), courseId: formData.get("courseId"), facultyId: formData.get("facultyId") ?? "", section: formData.get("section"), term: formData.get("term") });
    if (!parsed.success) return failed("Complete the course offering details.");
    const { data, error } = await createSupabaseAdminClient().from("course_offerings").insert({ academic_year: parsed.data.academicYear, capacity: parsed.data.capacity, course_id: parsed.data.courseId, faculty_id: parsed.data.facultyId || null, section: parsed.data.section, term: parsed.data.term }).select("id").single();
    if (error) return failed(error.code === "23505" ? "That section already exists for this term." : "Offering could not be created.");
    await audit(access.userId, "course_offering.created", "course_offering", data.id, { term: parsed.data.term, year: parsed.data.academicYear });
    refresh("/courses", "/schedules");
    return succeeded("Course offering created and ready for scheduling.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const facultySchema = z.object({
  departmentId: z.uuid(),
  designation: z.string().trim().min(2).max(100),
  displayName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  employeeNumber: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
});
export async function createFacultyAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = facultySchema.safeParse({ departmentId: formData.get("departmentId"), designation: formData.get("designation"), displayName: formData.get("displayName"), email: formData.get("email"), employeeNumber: formData.get("employeeNumber") });
    if (!parsed.success) return failed("Complete the faculty identity, employee number, designation, and department.");
    const client = createSupabaseAdminClient();
    const { data: existingProfile, error: profileLookupError } = await client
      .from("profiles")
      .select("id, clerk_user_id, campus_role")
      .eq("email", parsed.data.email)
      .maybeSingle();
    if (profileLookupError) return failed("Faculty identity could not be checked.");
    if (existingProfile?.campus_role === "super-admin") return failed("A super administrator cannot be reassigned as faculty.");

    const profileId = existingProfile?.id ?? `pending:${crypto.randomUUID()}`;
    const identityAlreadyLinked = Boolean(existingProfile?.clerk_user_id);
    const membershipStatus = identityAlreadyLinked ? "active" : "pending";
    const profileWrite = existingProfile
      ? client
          .from("profiles")
          .update({
            campus_role: "faculty",
            display_name: parsed.data.displayName,
            membership_status: membershipStatus,
            approved_at: identityAlreadyLinked ? new Date().toISOString() : null,
            valid_from: identityAlreadyLinked ? new Date().toISOString() : null,
            valid_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId)
      : client.from("profiles").insert({
          campus_role: "faculty",
          display_name: parsed.data.displayName,
          email: parsed.data.email,
          id: profileId,
          membership_status: "pending",
        });
    const { error: profileError } = await profileWrite;
    if (profileError) return failed("Faculty profile could not be prepared.");

    const { data, error } = await client.from("faculty_members").insert({ department_id: parsed.data.departmentId, designation: parsed.data.designation, employee_number: parsed.data.employeeNumber, profile_id: profileId }).select("id").single();
    if (error) {
      if (!existingProfile) await client.from("profiles").delete().eq("id", profileId);
      return failed(error.code === "23505" ? "That employee number or faculty profile already exists." : "Faculty member could not be created.");
    }
    await audit(access.userId, "faculty.created", "faculty_member", data.id, { employee_number: parsed.data.employeeNumber });
    refresh("/faculty", "/courses", "/settings");
    return succeeded(identityAlreadyLinked ? "Faculty profile created and activated for the existing verified identity." : "Faculty roster record created. It activates automatically when the faculty member signs in with this email.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const equipmentSchema = z.object({ assetTag: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()), category: z.string().trim().min(2).max(80), installedAt: z.union([z.iso.date(), z.literal("")]), name: z.string().trim().min(2).max(120), roomId: z.uuid(), status: z.enum(["operational", "degraded", "offline", "retired"]) });
export async function createEquipmentAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = equipmentSchema.safeParse({ assetTag: formData.get("assetTag"), category: formData.get("category"), installedAt: formData.get("installedAt") ?? "", name: formData.get("name"), roomId: formData.get("roomId"), status: formData.get("status") });
    if (!parsed.success) return failed("Complete the asset tag, name, category, room, and condition.");
    const { data, error } = await createSupabaseAdminClient().from("equipment").insert({ asset_tag: parsed.data.assetTag, category: parsed.data.category, installed_at: parsed.data.installedAt || null, name: parsed.data.name, room_id: parsed.data.roomId, status: parsed.data.status }).select("id").single();
    if (error) return failed(error.code === "23505" ? "That asset tag already exists." : "Equipment could not be created.");
    await audit(access.userId, "equipment.created", "equipment", data.id, { asset_tag: parsed.data.assetTag, status: parsed.data.status });
    refresh("/equipment", "/classrooms");
    return succeeded("Asset registered and facility readiness refreshed.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const roomSchema = z.object({ building: z.string().trim().min(2).max(100), capacity: z.coerce.number().int().positive().max(2000), code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()), floor: z.string().trim().max(30), kind: z.enum(["classroom", "laboratory"]), name: z.string().trim().min(2).max(120) });
export async function createRoomAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = roomSchema.safeParse({ building: formData.get("building"), capacity: formData.get("capacity"), code: formData.get("code"), floor: formData.get("floor") ?? "", kind: formData.get("kind"), name: formData.get("name") });
    if (!parsed.success) return failed("Complete the room code, name, building, kind, and capacity.");
    const { data, error } = await createSupabaseAdminClient().from("rooms").insert({ building: parsed.data.building, capacity: parsed.data.capacity, code: parsed.data.code, floor: parsed.data.floor || null, kind: parsed.data.kind, name: parsed.data.name }).select("id").single();
    if (error) return failed(error.code === "23505" ? "That room code already exists." : "Teaching space could not be created.");
    await audit(access.userId, "room.created", "room", data.id, { code: parsed.data.code, kind: parsed.data.kind });
    refresh("/classrooms", "/laboratories", "/equipment", "/schedules");
    return succeeded("Teaching space created and included in readiness monitoring.");
  } catch { return failed("Sign in with campus-management permission."); }
}

const equipmentStatusSchema = z.object({ equipmentId: z.uuid(), status: z.enum(["operational", "degraded", "offline", "retired"]) });
export async function updateEquipmentStatusAction(formData: FormData) {
  const access = await requirePermission("campus:manage");
  const parsed = equipmentStatusSchema.safeParse({ equipmentId: formData.get("equipmentId"), status: formData.get("status") });
  if (!parsed.success) return;
  const client = createSupabaseAdminClient();
  const { error } = await client.from("equipment").update({ last_serviced_at: parsed.data.status === "operational" ? new Date().toISOString().slice(0, 10) : undefined, status: parsed.data.status }).eq("id", parsed.data.equipmentId);
  if (!error) await audit(access.userId, "equipment.status_changed", "equipment", parsed.data.equipmentId, { status: parsed.data.status });
  refresh("/equipment", "/classrooms", "/maintenance");
}

const resultSchema = z.object({ academicYear: z.coerce.number().int().min(2000).max(2200), cgpa: z.coerce.number().min(0).max(10), gpa: z.coerce.number().min(0).max(10), publish: z.boolean(), semester: z.coerce.number().int().min(1).max(16), studentId: z.uuid(), term: z.enum(["spring", "summer", "fall", "winter"]) });
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

const notificationSchema = z.object({ body: z.string().trim().min(5).max(3000), channel: z.enum(["in_app", "email"]), recipientProfileId: z.string().min(2), subject: z.string().trim().min(3).max(160) });
export async function createNotificationAction(_: AdministrationActionState, formData: FormData): Promise<AdministrationActionState> {
  try {
    const access = await requirePermission("campus:manage");
    const parsed = notificationSchema.safeParse({ body: formData.get("body"), channel: formData.get("channel"), recipientProfileId: formData.get("recipientProfileId"), subject: formData.get("subject") });
    if (!parsed.success) return failed("Choose a recipient and complete the notification content.");
    const { data, error } = await createSupabaseAdminClient().from("notifications").insert({ body: parsed.data.body, channel: parsed.data.channel, recipient_profile_id: parsed.data.recipientProfileId, subject: parsed.data.subject }).select("id").single();
    if (error) return failed("Notification could not be queued.");
    await audit(access.userId, "notification.queued", "notification", data.id, { channel: parsed.data.channel });
    revalidatePath("/notifications");
    return succeeded("Notification queued for governed delivery.");
  } catch { return failed("Sign in with campus-management permission."); }
}

export async function markNotificationReadAction(formData: FormData) {
  const access = await requirePermission("workspace:access");
  const notificationId = z.uuid().safeParse(formData.get("notificationId"));
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

const membershipSchema = z.object({
  campusRole: z.enum(roles),
  membershipStatus: z.enum(membershipStatuses),
  profileId: z.string().min(2),
});

export async function updateCampusMembershipAction(formData: FormData) {
  const access = await requirePermission("campus:manage");
  const parsed = membershipSchema.safeParse({
    campusRole: formData.get("campusRole"),
    membershipStatus: formData.get("membershipStatus"),
    profileId: formData.get("profileId"),
  });
  if (!parsed.success) return;

  const client = createSupabaseAdminClient();
  const { data: target } = await client
    .from("profiles")
    .select("campus_role, clerk_user_id")
    .eq("id", parsed.data.profileId)
    .maybeSingle();

  if (parsed.data.profileId === access.profileId) return;
  if (
    (target?.campus_role === "super-admin" || parsed.data.campusRole === "super-admin") &&
    access.role !== "super-admin"
  ) return;

  const actorProfileId = await resolveActorProfileId(access.userId);
  const activated = parsed.data.membershipStatus === "active";
  const { error } = await client
    .from("profiles")
    .update({
      approved_at: activated ? new Date().toISOString() : null,
      approved_by_profile_id: activated ? actorProfileId : null,
      campus_role: parsed.data.campusRole,
      membership_status: parsed.data.membershipStatus,
      updated_at: new Date().toISOString(),
      valid_from: activated ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.profileId);

  if (!error) {
    const clerkSync = target?.clerk_user_id
      ? await syncClerkCampusAuthorization({
          role: parsed.data.campusRole,
          status: parsed.data.membershipStatus,
          userId: target.clerk_user_id,
        })
      : { metadata: "skipped", organization: "skipped" };
    await audit(access.userId, "campus_membership.updated", "profile", parsed.data.profileId, {
      campus_role: parsed.data.campusRole,
      clerk_metadata_sync: clerkSync.metadata,
      clerk_organization_sync: clerkSync.organization,
      membership_status: parsed.data.membershipStatus,
    });
  }
  revalidatePath("/settings");
}
