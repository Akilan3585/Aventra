import "server-only";

import { facultyOfferingIds, studentEnrollmentIds } from "@/server/auth/academic-scope";
import type { Role } from "@/server/auth/permissions";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import type { Database } from "@/types/database";

export const courseMaterialsBucket = "course-materials";
const signedUrlSeconds = 60 * 60;

export type CourseMaterialItem = {
  content: string | null;
  createdAt: string;
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  id: string;
  kind: Database["public"]["Enums"]["course_material_kind"];
  mimeType: string | null;
  publishedBy: string | null;
  resourceUrl: string | null;
  title: string;
};

export type CourseMaterialFolderGroup = { id: string | null; materials: CourseMaterialItem[]; name: string };

export type CourseMaterialsCourse = {
  code: string;
  folders: CourseMaterialFolderGroup[];
  id: string;
  label: string;
  section: string;
  title: string;
};

async function scopedOfferingIds(role: Role, profileId: string | null): Promise<string[] | null> {
  if (role === "faculty") return profileId ? facultyOfferingIds(profileId) : [];
  if (role !== "student") return null;
  const enrollmentIds = profileId ? await studentEnrollmentIds(profileId) : [];
  if (!enrollmentIds.length) return [];
  const { data, error } = await createSupabaseAdminClient().from("enrollments").select("offering_id").in("id", enrollmentIds);
  if (error) throw new DatabaseQueryError("load student material scope", error.message);
  return [...new Set(data.map(({ offering_id }) => offering_id))];
}

export async function loadCourseMaterialsWorkspace(role: Role, profileId: string | null) {
  const client = createSupabaseAdminClient();
  const offeringIds = await scopedOfferingIds(role, profileId);
  const empty = { courses: [] as CourseMaterialsCourse[], folderOptions: [] as Array<{ id: string; label: string; offeringId: string }>, offeringOptions: [] as Array<{ id: string; label: string }>, totals: { documents: 0, folders: 0, materials: 0 } };
  if (offeringIds && !offeringIds.length) return empty;

  let materialsQuery = client.from("course_materials").select(`
    id, offering_id, folder_id, kind, title, content, resource_url, file_path, file_name, file_size, mime_type, created_at,
    profiles (display_name)
  `);
  let foldersQuery = client.from("course_material_folders").select("id, offering_id, name");
  let offeringsQuery = client.from("course_offerings").select("id, section, academic_year, term, courses (code, title)");
  if (offeringIds) {
    materialsQuery = materialsQuery.in("offering_id", offeringIds);
    foldersQuery = foldersQuery.in("offering_id", offeringIds);
    offeringsQuery = offeringsQuery.in("id", offeringIds);
  }
  const [materialsResult, foldersResult, offeringsResult] = await Promise.all([
    materialsQuery.order("created_at", { ascending: false }).limit(500),
    foldersQuery.order("name"),
    offeringsQuery.order("academic_year", { ascending: false }),
  ]);
  if (materialsResult.error) throw new DatabaseQueryError("load course materials", materialsResult.error.message);
  if (foldersResult.error) throw new DatabaseQueryError("load course material folders", foldersResult.error.message);
  if (offeringsResult.error) throw new DatabaseQueryError("load course material offerings", offeringsResult.error.message);

  const filePaths = materialsResult.data.flatMap((material) => (material.file_path ? [material.file_path] : []));
  const signedUrls = new Map<string, string>();
  if (filePaths.length) {
    const { data, error } = await client.storage.from(courseMaterialsBucket).createSignedUrls(filePaths, signedUrlSeconds);
    if (error) throw new DatabaseQueryError("sign course material downloads", error.message);
    data.forEach((entry) => { if (entry.path && entry.signedUrl) signedUrls.set(entry.path, entry.signedUrl); });
  }

  const items = materialsResult.data.map((material) => ({
    folderId: material.folder_id,
    item: {
      content: material.content,
      createdAt: material.created_at,
      downloadUrl: material.file_path ? signedUrls.get(material.file_path) ?? null : null,
      fileName: material.file_name,
      fileSize: material.file_size,
      id: material.id,
      kind: material.kind,
      mimeType: material.mime_type,
      publishedBy: material.profiles?.display_name ?? null,
      resourceUrl: material.resource_url,
      title: material.title,
    } satisfies CourseMaterialItem,
    offeringId: material.offering_id,
  }));

  const courses = offeringsResult.data.map((offering) => {
    const folders: CourseMaterialFolderGroup[] = foldersResult.data
      .filter((folder) => folder.offering_id === offering.id)
      .map((folder) => ({ id: folder.id, materials: items.filter((entry) => entry.folderId === folder.id).map((entry) => entry.item), name: folder.name }));
    const general = items.filter((entry) => entry.offeringId === offering.id && !entry.folderId).map((entry) => entry.item);
    if (general.length) folders.push({ id: null, materials: general, name: "General" });
    return {
      code: offering.courses.code,
      folders,
      id: offering.id,
      label: `${offering.courses.code} — ${offering.courses.title} · ${offering.section}`,
      section: offering.section,
      title: offering.courses.title,
    };
  });

  return {
    // Scoped users see every class they belong to; campus-wide views only list classes with content.
    courses: offeringIds ? courses : courses.filter((course) => course.folders.length),
    folderOptions: foldersResult.data.map((folder) => ({ id: folder.id, label: folder.name, offeringId: folder.offering_id })),
    offeringOptions: courses.map((course) => ({ id: course.id, label: course.label })),
    totals: {
      documents: items.filter((entry) => entry.item.fileName).length,
      folders: foldersResult.data.length,
      materials: items.length,
    },
  };
}

export type CourseMaterialsWorkspace = Awaited<ReturnType<typeof loadCourseMaterialsWorkspace>>;
