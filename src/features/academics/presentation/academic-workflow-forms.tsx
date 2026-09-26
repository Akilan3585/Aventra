"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

import { createAssignmentAction, createMaterialFolderAction, createMaterialUploadAction, gradeSubmissionAction, publishCourseMaterialAction, type AcademicActionState } from "@/features/academics/application/academic-workflow-actions";
import { courseMaterialAcceptAttribute, courseMaterialMaxFileBytes } from "@/features/academics/domain/academic-rules";
import { uploadToSignedUrl } from "@/lib/storage-upload";

const initialState: AcademicActionState = { message: "", status: "idle" };
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const button = "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

function Feedback({ state }: { state: AcademicActionState }) {
  if (!state.message) return null;
  return <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-600" : "text-sm text-emerald-700"}>{state.message}</p>;
}

export function AssignmentCreator({ offerings }: { offerings: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(createAssignmentAction, initialState);
  return <form action={action} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 lg:grid-cols-5 lg:items-end">
    <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Class<select className={`${field} mt-1`} name="offeringId" required><option value="">Choose class</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-600">Assignment<input className={`${field} mt-1`} name="title" placeholder="Project review" required /></label>
    <label className="text-xs font-semibold text-slate-600">Maximum marks<input className={`${field} mt-1`} min="1" name="maximumMarks" required type="number" /></label>
    <label className="text-xs font-semibold text-slate-600">Due date<input className={`${field} mt-1`} name="dueAt" type="datetime-local" /></label>
    <div className="flex items-center gap-3 lg:col-span-5"><button className={button} disabled={pending || !offerings.length} type="submit">{pending ? "Publishing…" : "Publish assignment"}</button><Feedback state={state} /></div>
  </form>;
}

export function GradeSubmissionForm({ maximumMarks, submissionId }: { maximumMarks: number; submissionId: string }) {
  const [state, action, pending] = useActionState(gradeSubmissionAction, initialState);
  return <form action={action} className="flex min-w-[300px] flex-wrap items-center gap-2">
    <input name="submissionId" type="hidden" value={submissionId} />
    <input aria-label="Score" className={`${field} w-20`} max={maximumMarks} min="0" name="score" placeholder={`/${maximumMarks}`} required step="0.01" type="number" />
    <input aria-label="Feedback" className={`${field} min-w-32 flex-1`} name="feedback" placeholder="Feedback" />
    <button className={button} disabled={pending} type="submit">{pending ? "Saving…" : "Grade"}</button>
    <Feedback state={state} />
  </form>;
}

export function MaterialFolderCreator({ offerings }: { offerings: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(createMaterialFolderAction, initialState);
  return <form action={action} className="grid gap-3">
    <label className="text-xs font-semibold text-slate-600">Class<select className={`${field} mt-1`} name="offeringId" required><option value="">Choose class</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-600">Folder name<input className={`${field} mt-1`} maxLength={80} minLength={2} name="name" placeholder="Unit A" required /></label>
    <div className="flex flex-wrap items-center gap-3"><button className={`${button} bg-white !text-slate-900 ring-1 ring-slate-200 hover:!text-white`} disabled={pending || !offerings.length} type="submit">{pending ? "Creating..." : "Create folder"}</button><Feedback state={state} /></div>
  </form>;
}

const fileLimitLabel = `${Math.round(courseMaterialMaxFileBytes / (1024 * 1024))} MB`;

export function CourseMaterialPublisher({ folders, offerings }: { folders: Array<{ id: string; label: string; offeringId: string }>; offerings: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(publishCourseMaterialAction, initialState);
  const [, startTransition] = useTransition();
  const [offeringId, setOfferingId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [upload, setUpload] = useState<{ error: string | null; progress: number | null }>({ error: null, progress: null });
  const availableFolders = folders.filter((folder) => folder.offeringId === offeringId);
  const busy = pending || upload.progress !== null;

  // The file goes browser -> Storage first; only its path reaches the Server Action.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    formData.delete("file");
    if (file instanceof File && file.size > 0) {
      setUpload({ error: null, progress: 0 });
      const grant = await createMaterialUploadAction({ fileName: file.name, fileSize: file.size, folderId, mimeType: file.type, offeringId });
      if (!grant.ok) { setUpload({ error: grant.message, progress: null }); return; }
      try {
        await uploadToSignedUrl(grant.signedUrl, file, (progress) => setUpload({ error: null, progress }));
      } catch (error) {
        setUpload({ error: error instanceof Error ? error.message : "Upload failed.", progress: null });
        return;
      }
      formData.set("filePath", grant.path); formData.set("fileName", file.name); formData.set("fileSize", String(file.size)); formData.set("mimeType", file.type);
    }
    setUpload({ error: null, progress: null });
    startTransition(() => action(formData));
  }

  return <form className="grid gap-3" onSubmit={handleSubmit}>
    <label className="text-xs font-semibold text-slate-600">Class<select className={`${field} mt-1`} name="offeringId" onChange={(event) => { setOfferingId(event.target.value); setFolderId(""); }} required value={offeringId}><option value="">Choose class</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-600">Folder<select className={`${field} mt-1`} disabled={!offeringId || !availableFolders.length} name="folderId" onChange={(event) => setFolderId(event.target.value)} required value={folderId}><option value="">{offeringId ? availableFolders.length ? "Choose folder" : "No folders yet for this class" : "Choose a class first"}</option>{availableFolders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{offeringId && !availableFolders.length ? <span className="mt-1 block text-[11px] font-normal text-amber-700">Create a folder for this class first (New folder button), then publish into it.</span> : null}</label>
    <label className="text-xs font-semibold text-slate-600">Title<input className={`${field} mt-1`} maxLength={160} name="title" placeholder="Unit A - Lecture notes" required /></label>
    <label className="text-xs font-semibold text-slate-600">File<span className="block text-[11px] font-normal text-slate-500">PDF, Office document, image, audio, or video up to {fileLimitLabel}. Videos play inline for students.</span><input accept={courseMaterialAcceptAttribute} className={`${field} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`} disabled={busy} name="file" type="file" /></label>
    {upload.progress !== null ? <div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${upload.progress}%` }} /></div><p className="mt-1 text-xs text-slate-500">{upload.progress < 100 ? `Uploading… ${upload.progress}%` : "Upload complete, saving…"}</p></div> : null}
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-slate-600">More options: notes, link, and type<span className="float-right text-slate-400 group-open:hidden">+</span><span className="float-right hidden text-slate-400 group-open:inline">-</span></summary>
      <div className="grid gap-3 border-t border-slate-100 p-3">
        <label className="text-xs font-semibold text-slate-600">Notes for students<textarea className={`${field} mt-1 min-h-24`} maxLength={8000} name="content" placeholder="Key points, reading guidance, or worked examples" /></label>
        <label className="text-xs font-semibold text-slate-600">Resource link<input className={`${field} mt-1`} name="resourceUrl" placeholder="https://" type="url" /></label>
        <label className="text-xs font-semibold text-slate-600">Type when no file is attached<select className={`${field} mt-1`} defaultValue="notes" name="kind"><option value="notes">Notes</option><option value="study-material">Study material</option><option value="link">Resource link</option></select></label>
      </div>
    </details>
    {upload.error ? <p aria-live="polite" className="text-sm text-rose-600">{upload.error}</p> : null}
    <div className="flex flex-wrap items-center gap-3"><button className={button} disabled={busy || !offerings.length || !folderId} type="submit">{upload.progress !== null ? "Uploading…" : pending ? "Publishing…" : "Publish to students"}</button><Feedback state={state} /></div>
  </form>;
}
