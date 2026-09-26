export function assignmentDueDateIsValid(dueAt: string, now = new Date()) {
  return dueAt === "" || new Date(dueAt) > now;
}

export function canSubmitAssignment(
  assignment: { dueAt: string | null; offeringId: string },
  enrollment: { offeringId: string },
  now = new Date(),
) {
  if (assignment.offeringId !== enrollment.offeringId) return false;
  return !assignment.dueAt || new Date(assignment.dueAt) >= now;
}

export function scoreIsWithinMaximum(score: number, maximumMarks: number) {
  return Number.isFinite(score) && score >= 0 && score <= maximumMarks;
}

export const courseMaterialKinds = ["notes", "study-material", "link", "document"] as const;
export type CourseMaterialKind = (typeof courseMaterialKinds)[number];

/** Files go straight from the browser to Supabase Storage; 50 MB is the Supabase free-plan ceiling per object. */
export const courseMaterialMaxFileBytes = 50 * 1024 * 1024;
export const courseMaterialDocumentExtensions = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "md", "csv", "zip"] as const;
export const courseMaterialImageExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp"] as const;
export const courseMaterialVideoExtensions = ["mp4", "webm", "mov", "m4v"] as const;
export const courseMaterialAudioExtensions = ["mp3", "m4a", "wav", "ogg"] as const;
export const courseMaterialFileExtensions = [...courseMaterialDocumentExtensions, ...courseMaterialImageExtensions, ...courseMaterialVideoExtensions, ...courseMaterialAudioExtensions] as const;
export const courseMaterialAcceptAttribute = courseMaterialFileExtensions.map((extension) => `.${extension}`).join(",");

export type CourseMaterialMedia = "audio" | "file" | "image" | "video";

/** How a stored file should be presented to students: inline player, inline image, or a download link. */
export function courseMaterialMediaKind(fileName: string | null, mimeType: string | null): CourseMaterialMedia {
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("image/")) return "image";
  const extension = fileName ? courseMaterialFileExtension(fileName) : "";
  if ((courseMaterialVideoExtensions as readonly string[]).includes(extension)) return "video";
  if ((courseMaterialAudioExtensions as readonly string[]).includes(extension)) return "audio";
  if ((courseMaterialImageExtensions as readonly string[]).includes(extension)) return "image";
  return "file";
}

const uploadIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Object key for a direct upload: `<offering>/<folder>/<uploadId>.<ext>` so scope can be verified from the path alone. */
export function courseMaterialStoragePath({ fileName, folderId, offeringId, uploadId }: { fileName: string; folderId: string; offeringId: string; uploadId: string }) {
  const extension = courseMaterialFileExtension(fileName) || "bin";
  return `${offeringId}/${folderId}/${uploadId}.${extension}`;
}

/** True when a client-supplied path was minted by `courseMaterialStoragePath` for this class and folder. */
export function courseMaterialStoragePathIsValid(path: string, scope: { folderId: string; offeringId: string }) {
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== scope.offeringId || parts[1] !== scope.folderId) return false;
  const [uploadId, extension, ...rest] = parts[2].split(".");
  return rest.length === 0 && uploadIdPattern.test(uploadId) && (courseMaterialFileExtensions as readonly string[]).concat("bin").includes(extension ?? "");
}

export function courseMaterialFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return fileName.includes(".") ? extension : "";
}

export function courseMaterialFileIsAllowed(file: { name: string; size: number }) {
  const extension = courseMaterialFileExtension(file.name);
  return (courseMaterialFileExtensions as readonly string[]).includes(extension) && file.size > 0 && file.size <= courseMaterialMaxFileBytes;
}

export function courseMaterialHasBody(material: { content: string; hasFile: boolean; resourceUrl: string }) {
  return material.hasFile || material.content.trim().length > 0 || material.resourceUrl.trim().length > 0;
}

export function courseMaterialUrlIsValid(resourceUrl: string) {
  if (resourceUrl === "") return true;
  try {
    const url = new URL(resourceUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function materialFolderNameIsValid(name: string) {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 80 && !trimmed.includes("/") && !trimmed.includes(String.fromCharCode(92));
}
