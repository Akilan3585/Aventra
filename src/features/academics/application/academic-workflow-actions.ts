"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  assignmentDueDateIsValid,
  canSubmitAssignment,
  courseMaterialFileIsAllowed,
  courseMaterialHasBody,
  courseMaterialKinds,
  courseMaterialMaxFileBytes,
  courseMaterialStoragePath,
  courseMaterialStoragePathIsValid,
  courseMaterialUrlIsValid,
  materialFolderNameIsValid,
  scoreIsWithinMaximum,
} from "@/features/academics/domain/academic-rules";
import { courseMaterialsBucket } from "@/features/academics/infrastructure/course-materials.repository";
import { facultyOwnsEnrollment, facultyOwnsOffering, studentEnrollmentIds } from "@/server/auth/academic-scope";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AcademicActionState = { message: string; status: "idle" | "error" | "success" };
const fail = (message: string): AcademicActionState => ({ message, status: "error" });
const success = (message: string): AcademicActionState => ({ message, status: "success" });

async function audit(actorProfileId: string | null, action: string, entityType: string, entityId: string, metadata = {}) {
  await createSupabaseAdminClient().from("audit_logs").insert({ action, actor_profile_id: actorProfileId, entity_id: entityId, entity_type: entityType, metadata });
}

const assignmentSchema = z.object({
  dueAt: z.union([z.iso.datetime({ local: true }), z.literal("")]),
  maximumMarks: z.coerce.number().positive().max(1000),
  offeringId: z.guid(),
  title: z.string().trim().min(3).max(160),
});

export async function createAssignmentAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("assignments:manage");
    const parsed = assignmentSchema.safeParse({ dueAt: formData.get("dueAt") ?? "", maximumMarks: formData.get("maximumMarks"), offeringId: formData.get("offeringId"), title: formData.get("title") });
    if (!parsed.success) return fail("Complete the class, title, marks, and a valid due date.");
    if (!assignmentDueDateIsValid(parsed.data.dueAt)) return fail("The due date must be in the future.");
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, parsed.data.offeringId)))) return fail("You can create work only for your assigned classes.");
    const client = createSupabaseAdminClient();
    const { data, error } = await client.from("assignments").insert({ due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null, maximum_marks: parsed.data.maximumMarks, offering_id: parsed.data.offeringId, title: parsed.data.title }).select("id").single();
    if (error) return fail("Assignment could not be created.");
    await audit(access.profileId, "assignment.created", "assignment", data.id, { offering_id: parsed.data.offeringId });
    revalidatePath("/assignments"); revalidatePath("/student-workspace");
    return success("Assignment published to enrolled students.");
  } catch { return fail("You do not have permission to create assignments."); }
}

const submissionSchema = z.object({ assignmentId: z.guid(), enrollmentId: z.guid() });
export async function submitAssignmentAction(formData: FormData) {
  const access = await requirePermission("submissions:manage");
  const parsed = submissionSchema.safeParse({ assignmentId: formData.get("assignmentId"), enrollmentId: formData.get("enrollmentId") });
  if (!parsed.success || access.role !== "student" || !access.profileId) return;
  const ownIds = await studentEnrollmentIds(access.profileId);
  if (!ownIds.includes(parsed.data.enrollmentId)) return;
  const client = createSupabaseAdminClient();
  const [{ data: assignment }, { data: enrollment }] = await Promise.all([
    client.from("assignments").select("offering_id, due_at").eq("id", parsed.data.assignmentId).maybeSingle(),
    client.from("enrollments").select("offering_id").eq("id", parsed.data.enrollmentId).maybeSingle(),
  ]);
  if (!assignment || !enrollment || !canSubmitAssignment(
    { dueAt: assignment.due_at, offeringId: assignment.offering_id },
    { offeringId: enrollment.offering_id },
  )) return;
  const { data } = await client.from("assignment_submissions").upsert({ assignment_id: parsed.data.assignmentId, enrollment_id: parsed.data.enrollmentId, submitted_at: new Date().toISOString() }, { onConflict: "assignment_id,enrollment_id" }).select("id").single();
  if (data) await audit(access.profileId, "assignment.submitted", "assignment_submission", data.id);
  revalidatePath("/assignments"); revalidatePath("/student-workspace");
}

const gradeSchema = z.object({ feedback: z.string().trim().max(2000), score: z.coerce.number().min(0), submissionId: z.guid() });
export async function gradeSubmissionAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("assignments:manage");
    const parsed = gradeSchema.safeParse({ feedback: formData.get("feedback") ?? "", score: formData.get("score"), submissionId: formData.get("submissionId") });
    if (!parsed.success) return fail("Enter a valid score and feedback.");
    const client = createSupabaseAdminClient();
    const { data: submission } = await client.from("assignment_submissions").select("enrollment_id, submitted_at, assignments (maximum_marks, offering_id)").eq("id", parsed.data.submissionId).maybeSingle();
    if (!submission?.submitted_at) return fail("Only a submitted assignment can be graded.");
    if (!scoreIsWithinMaximum(parsed.data.score, Number(submission.assignments.maximum_marks))) return fail("Score cannot exceed the assignment maximum.");
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsEnrollment(access.profileId, submission.enrollment_id)))) return fail("You can grade only your assigned students.");
    const { error } = await client.from("assignment_submissions").update({ feedback: parsed.data.feedback || null, graded_at: new Date().toISOString(), graded_by_profile_id: access.profileId, score: parsed.data.score }).eq("id", parsed.data.submissionId);
    if (error) return fail("Grade could not be saved.");
    await audit(access.profileId, "assignment.graded", "assignment_submission", parsed.data.submissionId, { score: parsed.data.score });
    revalidatePath("/assignments"); revalidatePath("/student-workspace");
    return success("Grade and feedback saved.");
  } catch { return fail("You do not have permission to grade submissions."); }
}

const missingTableMessage = "The study materials tables do not exist yet. Apply supabase/migrations/20260923120000_add_course_materials.sql to the Supabase project and try again.";

const folderSchema = z.object({ name: z.string().trim().min(2).max(80), offeringId: z.guid() });
export async function createMaterialFolderAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("materials:manage");
    const parsed = folderSchema.safeParse({ name: formData.get("name"), offeringId: formData.get("offeringId") });
    if (!parsed.success || !materialFolderNameIsValid(parsed.data.name)) return fail("Choose a class and give the folder a name between 2 and 80 characters without slashes.");
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, parsed.data.offeringId)))) return fail("You can create folders only for your assigned classes.");
    const client = createSupabaseAdminClient();
    const { data, error } = await client.from("course_material_folders").insert({ created_by_profile_id: access.profileId, name: parsed.data.name, offering_id: parsed.data.offeringId }).select("id").single();
    if (error) return fail(error.code === "23505" ? "A folder with that name already exists for this class." : error.code === "PGRST205" ? missingTableMessage : "Folder could not be created.");
    await audit(access.profileId, "course_material_folder.created", "course_material_folder", data.id, { name: parsed.data.name, offering_id: parsed.data.offeringId });
    revalidatePath("/courses");
    return success(`Folder "${parsed.data.name}" created. Upload documents into it below.`);
  } catch { return fail("You do not have permission to organise study materials."); }
}

const removeFolderSchema = z.object({ folderId: z.guid() });
export async function removeMaterialFolderAction(formData: FormData) {
  const access = await requirePermission("materials:manage");
  const parsed = removeFolderSchema.safeParse({ folderId: formData.get("folderId") });
  if (!parsed.success) return;
  const client = createSupabaseAdminClient();
  const [{ data: folder }, count] = await Promise.all([
    client.from("course_material_folders").select("offering_id, name").eq("id", parsed.data.folderId).maybeSingle(),
    client.from("course_materials").select("id", { count: "exact", head: true }).eq("folder_id", parsed.data.folderId),
  ]);
  if (!folder || (count.count ?? 0) > 0) return;
  if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, folder.offering_id)))) return;
  const { error } = await client.from("course_material_folders").delete().eq("id", parsed.data.folderId);
  if (error) return;
  await audit(access.profileId, "course_material_folder.removed", "course_material_folder", parsed.data.folderId, { name: folder.name, offering_id: folder.offering_id });
  revalidatePath("/courses");
}

const fileLimitLabel = `${Math.round(courseMaterialMaxFileBytes / (1024 * 1024))} MB`;
const uploadGrantSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.coerce.number().int().positive(),
  folderId: z.guid(),
  mimeType: z.string().trim().max(200),
  offeringId: z.guid(),
});

export type MaterialUploadGrant = { message: string; ok: false } | { ok: true; path: string; signedUrl: string };

/**
 * Step 1 of publishing a file: authorize the class and folder, then mint a
 * signed upload URL so the browser sends the bytes straight to Storage.
 */
export async function createMaterialUploadAction(input: unknown): Promise<MaterialUploadGrant> {
  try {
    const access = await requirePermission("materials:manage");
    const parsed = uploadGrantSchema.safeParse(input);
    if (!parsed.success) return { message: "Choose a class, a folder, and a file.", ok: false };
    if (!courseMaterialFileIsAllowed({ name: parsed.data.fileName, size: parsed.data.fileSize })) return { message: `Upload a document, image, audio, or video file up to ${fileLimitLabel}.`, ok: false };
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, parsed.data.offeringId)))) return { message: "You can publish materials only for your assigned classes.", ok: false };
    const client = createSupabaseAdminClient();
    const { data: folder } = await client.from("course_material_folders").select("offering_id").eq("id", parsed.data.folderId).maybeSingle();
    if (!folder || folder.offering_id !== parsed.data.offeringId) return { message: "Choose a folder that belongs to the selected class.", ok: false };
    const path = courseMaterialStoragePath({ fileName: parsed.data.fileName, folderId: parsed.data.folderId, offeringId: parsed.data.offeringId, uploadId: crypto.randomUUID() });
    const { data, error } = await client.storage.from(courseMaterialsBucket).createSignedUploadUrl(path);
    if (error || !data) return { message: /bucket/i.test(error?.message ?? "") ? "The course-materials storage bucket is missing. Apply the latest migration to the Supabase project." : "The upload could not be prepared. Try again.", ok: false };
    return { ok: true, path: data.path, signedUrl: data.signedUrl };
  } catch {
    return { message: "You do not have permission to publish study materials.", ok: false };
  }
}

const materialSchema = z.object({
  content: z.string().trim().max(8000),
  fileName: z.string().trim().max(255),
  filePath: z.string().trim().max(400),
  fileSize: z.union([z.literal(""), z.coerce.number().int().positive()]),
  folderId: z.guid(),
  kind: z.enum(courseMaterialKinds),
  mimeType: z.string().trim().max(200),
  offeringId: z.guid(),
  resourceUrl: z.string().trim().max(2000),
  title: z.string().trim().min(3).max(160),
});

/**
 * Step 2 of publishing: record the material. When a file was uploaded
 * directly to Storage, its path is verified against the class and folder and
 * the object is confirmed to exist before the row is written.
 */
export async function publishCourseMaterialAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("materials:manage");
    const parsed = materialSchema.safeParse({
      content: formData.get("content") ?? "", fileName: formData.get("fileName") ?? "", filePath: formData.get("filePath") ?? "", fileSize: formData.get("fileSize") ?? "",
      folderId: formData.get("folderId") ?? "", kind: formData.get("kind") ?? "notes", mimeType: formData.get("mimeType") ?? "", offeringId: formData.get("offeringId"),
      resourceUrl: formData.get("resourceUrl") ?? "", title: formData.get("title"),
    });
    if (!parsed.success) return fail("Choose a class and a folder, give the material a title, and keep it within the size limits.");
    const hasFile = Boolean(parsed.data.filePath);
    if (!courseMaterialHasBody({ ...parsed.data, hasFile })) return fail("Upload a file, write notes, or add a resource link.");
    if (!courseMaterialUrlIsValid(parsed.data.resourceUrl)) return fail("The resource link must start with http:// or https://.");
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, parsed.data.offeringId)))) return fail("You can publish materials only for your assigned classes.");
    const client = createSupabaseAdminClient();
    const { data: folder } = await client.from("course_material_folders").select("offering_id").eq("id", parsed.data.folderId).maybeSingle();
    if (!folder || folder.offering_id !== parsed.data.offeringId) return fail("Choose a folder that belongs to the selected class.");

    const filePath = parsed.data.filePath || null;
    if (filePath) {
      if (!courseMaterialStoragePathIsValid(filePath, { folderId: parsed.data.folderId, offeringId: parsed.data.offeringId }) || !parsed.data.fileName || parsed.data.fileSize === "") return fail("The uploaded file could not be verified. Upload it again.");
      if (!courseMaterialFileIsAllowed({ name: parsed.data.fileName, size: parsed.data.fileSize })) return fail(`Upload a document, image, audio, or video file up to ${fileLimitLabel}.`);
      const [offeringDir, folderDir, objectName] = filePath.split("/");
      const { data: objects, error } = await client.storage.from(courseMaterialsBucket).list(`${offeringDir}/${folderDir}`, { limit: 1, search: objectName });
      if (error || !objects?.some((object) => object.name === objectName)) return fail("The upload did not finish. Try publishing again.");
    }

    const { data, error } = await client.from("course_materials").insert({
      content: parsed.data.content || null,
      file_name: filePath ? parsed.data.fileName.slice(0, 255) : null,
      file_path: filePath,
      file_size: filePath && parsed.data.fileSize !== "" ? parsed.data.fileSize : null,
      folder_id: parsed.data.folderId,
      kind: filePath ? "document" : parsed.data.kind === "document" ? "notes" : parsed.data.kind,
      mime_type: filePath ? parsed.data.mimeType || null : null,
      offering_id: parsed.data.offeringId,
      published_by_profile_id: access.profileId,
      resource_url: parsed.data.resourceUrl || null,
      title: parsed.data.title,
    }).select("id").single();
    if (error) {
      if (filePath) await client.storage.from(courseMaterialsBucket).remove([filePath]);
      return fail(error.code === "PGRST205" ? missingTableMessage : "Study material could not be published.");
    }
    await audit(access.profileId, "course_material.published", "course_material", data.id, { folder_id: parsed.data.folderId, has_file: Boolean(filePath), kind: filePath ? "document" : parsed.data.kind, mime_type: filePath ? parsed.data.mimeType || null : null, offering_id: parsed.data.offeringId });
    revalidatePath("/courses"); revalidatePath("/student-workspace");
    return success(filePath ? `"${parsed.data.fileName}" published to enrolled students.` : "Study material published to enrolled students.");
  } catch { return fail("You do not have permission to publish study materials."); }
}

const removeMaterialSchema = z.object({ materialId: z.guid() });
export async function removeCourseMaterialAction(formData: FormData) {
  const access = await requirePermission("materials:manage");
  const parsed = removeMaterialSchema.safeParse({ materialId: formData.get("materialId") });
  if (!parsed.success) return;
  const client = createSupabaseAdminClient();
  const { data: material } = await client.from("course_materials").select("offering_id, file_path").eq("id", parsed.data.materialId).maybeSingle();
  if (!material) return;
  if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, material.offering_id)))) return;
  const { error } = await client.from("course_materials").delete().eq("id", parsed.data.materialId);
  if (error) return;
  if (material.file_path) await client.storage.from(courseMaterialsBucket).remove([material.file_path]);
  await audit(access.profileId, "course_material.removed", "course_material", parsed.data.materialId, { had_file: Boolean(material.file_path), offering_id: material.offering_id });
  revalidatePath("/courses"); revalidatePath("/student-workspace");
}
