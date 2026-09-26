import { BookMarked, Download, ExternalLink, FileText, FolderOpen, Link2, Trash2 } from "lucide-react";

import { StatusPill } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { removeCourseMaterialAction, removeMaterialFolderAction } from "@/features/academics/application/academic-workflow-actions";
import { courseMaterialMediaKind } from "@/features/academics/domain/academic-rules";
import type { CourseMaterialItem, CourseMaterialsCourse } from "@/features/academics/infrastructure/course-materials.repository";

const kindMeta = {
  document: { icon: Download, label: "Document" },
  link: { icon: Link2, label: "Resource link" },
  notes: { icon: FileText, label: "Notes" },
  "study-material": { icon: BookMarked, label: "Study material" },
} as const;

const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const iconButton = "rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700";

function MaterialRow({ canManage, material }: { canManage: boolean; material: CourseMaterialItem }) {
  const media = courseMaterialMediaKind(material.fileName, material.mimeType);
  const meta = material.kind === "document" && media !== "file" ? { icon: kindMeta.document.icon, label: media === "video" ? "Video" : media === "audio" ? "Audio" : "Image" } : kindMeta[material.kind];
  const Icon = meta.icon;
  return <article className="flex gap-3 px-5 py-4 sm:px-6">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-4" /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-950">{material.title}</h4><StatusPill tone="neutral">{meta.label}</StatusPill></div>
      {material.content ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{material.content}</p> : null}
      {material.downloadUrl && media === "video" ? <video className="mt-3 aspect-video w-full max-w-2xl rounded-xl bg-black" controls preload="metadata" src={material.downloadUrl} /> : null}
      {material.downloadUrl && media === "audio" ? <audio className="mt-3 w-full max-w-md" controls preload="none" src={material.downloadUrl} /> : null}
      {material.downloadUrl && media === "image" ? <a className="mt-3 block" href={material.downloadUrl} rel="noopener noreferrer" target="_blank">
        {/* Signed, expiring Storage URL: next/image cannot optimise it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={material.title} className="max-h-80 rounded-xl border border-slate-200" loading="lazy" src={material.downloadUrl} />
      </a> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {material.downloadUrl && material.fileName ? <a className="inline-flex max-w-full items-center gap-1 truncate font-semibold text-blue-700 hover:text-blue-800" href={material.downloadUrl} rel="noopener noreferrer" target="_blank"><Download className="size-3.5 shrink-0" /><span className="truncate">{material.fileName}</span>{material.fileSize ? <span className="shrink-0 font-normal text-slate-500">({formatSize(material.fileSize)})</span> : null}</a> : null}
        {material.fileName && !material.downloadUrl ? <span className="text-amber-700">{material.fileName} (download link unavailable)</span> : null}
        {material.resourceUrl ? <a className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800" href={material.resourceUrl} rel="noopener noreferrer" target="_blank">Open link <ExternalLink className="size-3.5" /></a> : null}
        <span>{formatDate(material.createdAt)}{material.publishedBy ? ` · ${material.publishedBy}` : ""}</span>
      </div>
    </div>
    {canManage ? <form action={removeCourseMaterialAction}><input name="materialId" type="hidden" value={material.id} /><button aria-label={`Remove ${material.title}`} className={iconButton} type="submit"><Trash2 className="size-4" /></button></form> : null}
  </article>;
}

function CourseCard({ canManage, course }: { canManage: boolean; course: CourseMaterialsCourse }) {
  const materialCount = course.folders.reduce((sum, folder) => sum + folder.materials.length, 0);
  return <Card className="overflow-hidden" id={`class-${course.id}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
      <div className="min-w-0"><p className="font-mono text-[11px] font-bold uppercase tracking-wide text-blue-700">{course.code} · {course.section}</p><h3 className="mt-0.5 truncate font-semibold text-slate-950">{course.title}</h3></div>
      <p className="shrink-0 text-xs text-slate-500">{course.folders.filter((folder) => folder.id).length} folders · {materialCount} {materialCount === 1 ? "item" : "items"}</p>
    </div>
    {course.folders.length ? <div className="divide-y divide-slate-100">{course.folders.map((folder) => <details className="group" key={folder.id ?? "general"} open>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-slate-50 sm:px-6">
        <FolderOpen className="size-4 text-amber-500" />
        <span className="flex-1 text-sm font-semibold text-slate-900">{folder.name}</span>
        <span className="text-xs text-slate-500">{folder.materials.length}</span>
        {canManage && folder.id && !folder.materials.length ? <form action={removeMaterialFolderAction}><input name="folderId" type="hidden" value={folder.id} /><button aria-label={`Remove folder ${folder.name}`} className={iconButton} type="submit"><Trash2 className="size-3.5" /></button></form> : null}
      </summary>
      {folder.materials.length ? <div className="divide-y divide-slate-100 border-t border-slate-100">{folder.materials.map((material) => <MaterialRow canManage={canManage} key={material.id} material={material} />)}</div> : <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500 sm:px-6">This folder is empty.</p>}
    </details>)}</div> : <p className="px-5 py-5 text-sm text-slate-500 sm:px-6">{canManage ? "Nothing published for this class yet. Use New folder or Publish material above." : "No study materials have been shared for this class yet."}</p>}
  </Card>;
}

export function CourseMaterialsPanel({ canManage, courses, layout = "stack" }: { canManage: boolean; courses: CourseMaterialsCourse[]; layout?: "grid" | "stack" }) {
  if (!courses.length) return <Card className="flex items-center gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookMarked className="size-5" /></span><div><p className="font-semibold text-slate-950">No study materials yet.</p><p className="mt-0.5 text-sm text-slate-500">{canManage ? "Use Publish material above to share a document, notes, or a link with a class. Enrolled students see it immediately." : "Study materials appear here after your faculty publish notes or documents to a class you are enrolled in."}</p></div></Card>;
  return <div className={layout === "grid" ? "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]" : "space-y-3"}>{courses.map((course) => <CourseCard canManage={canManage} course={course} key={course.id} />)}</div>;
}

export function CourseMaterialsClassNav({ courses }: { courses: CourseMaterialsCourse[] }) {
  if (courses.length < 2) return null;
  return <nav aria-label="Jump to class" className="flex flex-wrap gap-2">{courses.map((course) => <a className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700" href={`#class-${course.id}`} key={course.id}>{course.code} · {course.section}</a>)}</nav>;
}
