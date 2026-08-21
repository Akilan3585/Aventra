"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";

import {
  createCourseAction,
  createDepartmentAction,
  createEquipmentAction,
  createFacultyAction,
  createNotificationAction,
  createOfferingAction,
  createRoomAction,
  publishResultAction,
  updateProfileAction,
  type AdministrationActionState,
} from "@/features/administration/application/administration-actions";
import { cn } from "@/lib/utils";

export type FormOption = { id: string; label: string };
type FormKind = "course" | "department" | "equipment" | "faculty" | "notification" | "offering" | "profile" | "result" | "room";

const actions: Record<FormKind, (state: AdministrationActionState, formData: FormData) => Promise<AdministrationActionState>> = {
  course: createCourseAction,
  department: createDepartmentAction,
  equipment: createEquipmentAction,
  faculty: createFacultyAction,
  notification: createNotificationAction,
  offering: createOfferingAction,
  profile: updateProfileAction,
  result: publishResultAction,
  room: createRoomAction,
};
const initialAdministrationState: AdministrationActionState = { message: "", status: "idle" };

const copy: Record<FormKind, { button: string; description: string; title: string }> = {
  course: { button: "Add course", description: "Create a governed catalog entry owned by an academic department.", title: "New course" },
  department: { button: "Add department", description: "Create an organizational owner for students, faculty, and courses.", title: "New department" },
  equipment: { button: "Register asset", description: "Register a room-bound asset and include it in readiness calculations.", title: "New equipment asset" },
  faculty: { button: "Add faculty", description: "Create the faculty roster, teaching identity, and department ownership in one step. Use the exact email they will use to sign in.", title: "New faculty member" },
  notification: { button: "Compose", description: "Queue a targeted, auditable campus communication.", title: "New notification" },
  offering: { button: "Add offering", description: "Open a term section before scheduling rooms and sessions.", title: "New course offering" },
  profile: { button: "Edit profile", description: "Update the display name used throughout the campus workspace.", title: "Profile details" },
  result: { button: "Record result", description: "Save or publish a verified semester GPA and CGPA result.", title: "Semester result" },
  room: { button: "Add space", description: "Register a classroom or laboratory for scheduling and readiness monitoring.", title: "New teaching space" },
};

const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "text-sm font-medium text-slate-700";

function SelectField({ label, name, options, required = true }: { label: string; name: string; options: FormOption[]; required?: boolean }) {
  return <label><span className={labelClass}>{label}</span><select className={fieldClass} name={name} required={required}><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}

function Fields({ kind, options }: { kind: FormKind; options: Record<string, FormOption[]> }) {
  if (kind === "department") return <><label><span className={labelClass}>Code</span><input className={fieldClass} maxLength={12} name="code" placeholder="CSE" required /></label><label><span className={labelClass}>Department name</span><input className={fieldClass} maxLength={120} name="name" placeholder="Computer Science and Engineering" required /></label></>;
  if (kind === "course") return <><label><span className={labelClass}>Course code</span><input className={fieldClass} maxLength={16} name="code" placeholder="CSE401" required /></label><label><span className={labelClass}>Credit hours</span><input className={fieldClass} max="12" min="0.5" name="creditHours" required step="0.5" type="number" /></label><label className="sm:col-span-2"><span className={labelClass}>Course title</span><input className={fieldClass} maxLength={160} name="title" required /></label><SelectField label="Department" name="departmentId" options={options.departments ?? []} /></>;
  if (kind === "offering") return <><SelectField label="Course" name="courseId" options={options.courses ?? []} /><SelectField label="Faculty (optional)" name="facultyId" options={options.faculty ?? []} required={false} /><label><span className={labelClass}>Academic year</span><input className={fieldClass} defaultValue={new Date().getFullYear()} name="academicYear" required type="number" /></label><label><span className={labelClass}>Term</span><select className={fieldClass} name="term" required><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select></label><label><span className={labelClass}>Section</span><input className={fieldClass} name="section" placeholder="A" required /></label><label><span className={labelClass}>Capacity</span><input className={fieldClass} min="1" name="capacity" required type="number" /></label></>;
  if (kind === "faculty") return <><label><span className={labelClass}>Full name</span><input className={fieldClass} maxLength={120} name="displayName" placeholder="Dr. Priya Krishnan" required /></label><label><span className={labelClass}>Campus email</span><input className={fieldClass} name="email" placeholder="priya@college.edu" required type="email" /></label><label><span className={labelClass}>Employee / faculty number</span><input className={fieldClass} name="employeeNumber" placeholder="CSE-FAC-103" required /></label><label><span className={labelClass}>Designation</span><input className={fieldClass} name="designation" placeholder="Assistant Professor" required /></label><SelectField label="Department" name="departmentId" options={options.departments ?? []} /><p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800 sm:col-span-2">If this email already has a verified Clerk account, access is activated immediately. Otherwise, the roster stays pending until the faculty member signs in using this exact email.</p></>;
  if (kind === "equipment") return <><label><span className={labelClass}>Asset tag</span><input className={fieldClass} name="assetTag" placeholder="AV-2042" required /></label><label><span className={labelClass}>Asset name</span><input className={fieldClass} name="name" placeholder="Laser projector" required /></label><label><span className={labelClass}>Category</span><input className={fieldClass} name="category" placeholder="Audio visual" required /></label><SelectField label="Room" name="roomId" options={options.rooms ?? []} /><label><span className={labelClass}>Condition</span><select className={fieldClass} name="status"><option value="operational">Operational</option><option value="degraded">Degraded</option><option value="offline">Offline</option><option value="retired">Retired</option></select></label><label><span className={labelClass}>Installed date</span><input className={fieldClass} name="installedAt" type="date" /></label></>;
  if (kind === "room") return <><label><span className={labelClass}>Room code</span><input className={fieldClass} name="code" placeholder="LAB-204" required /></label><label><span className={labelClass}>Name</span><input className={fieldClass} name="name" placeholder="Advanced Computing Lab" required /></label><label><span className={labelClass}>Building</span><input className={fieldClass} name="building" required /></label><label><span className={labelClass}>Floor</span><input className={fieldClass} name="floor" /></label><label><span className={labelClass}>Space type</span><select className={fieldClass} name="kind"><option value="laboratory">Laboratory</option><option value="classroom">Classroom</option></select></label><label><span className={labelClass}>Capacity</span><input className={fieldClass} min="1" name="capacity" required type="number" /></label></>;
  if (kind === "result") return <><SelectField label="Student" name="studentId" options={options.students ?? []} /><label><span className={labelClass}>Academic year</span><input className={fieldClass} defaultValue={new Date().getFullYear()} name="academicYear" required type="number" /></label><label><span className={labelClass}>Term</span><select className={fieldClass} name="term"><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select></label><label><span className={labelClass}>Semester</span><input className={fieldClass} max="16" min="1" name="semester" required type="number" /></label><label><span className={labelClass}>GPA</span><input className={fieldClass} max="10" min="0" name="gpa" required step="0.01" type="number" /></label><label><span className={labelClass}>CGPA</span><input className={fieldClass} max="10" min="0" name="cgpa" required step="0.01" type="number" /></label><label className="flex items-center gap-3 sm:col-span-2"><input className="size-4 rounded border-slate-300" name="publish" type="checkbox" /><span className={labelClass}>Publish immediately</span></label></>;
  if (kind === "notification") return <><SelectField label="Recipient" name="recipientProfileId" options={options.profiles ?? []} /><label><span className={labelClass}>Channel</span><select className={fieldClass} name="channel"><option value="in_app">In-app</option><option value="email">Email queue</option></select></label><label className="sm:col-span-2"><span className={labelClass}>Subject</span><input className={fieldClass} maxLength={160} name="subject" required /></label><label className="sm:col-span-2"><span className={labelClass}>Message</span><textarea className={fieldClass} name="body" required rows={5} /></label></>;
  return <label className="sm:col-span-2"><span className={labelClass}>Display name</span><input className={fieldClass} defaultValue={options.profile?.[0]?.label} name="displayName" required /></label>;
}

export function AdministrationForm({ canManage, kind, options = {} }: { canManage: boolean; kind: FormKind; options?: Record<string, FormOption[]> }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(actions[kind], initialAdministrationState);
  if (!canManage) return null;
  const content = copy[kind];
  return <>
    <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700" onClick={() => setOpen(true)} type="button"><Plus className="size-4" />{content.button}</button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Authorized workflow</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">{content.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{content.description}</p></div><button aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button></div><form action={action} className="mt-7 grid gap-5 sm:grid-cols-2"><Fields kind={kind} options={options} />{state.message ? <p aria-live="polite" className={cn("rounded-xl px-4 py-3 text-sm sm:col-span-2", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{state.message}</p> : null}<div className="flex justify-end gap-3 sm:col-span-2"><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)} type="button">Done</button><button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving…" : content.button}</button></div></form></div></div> : null}
  </>;
}
