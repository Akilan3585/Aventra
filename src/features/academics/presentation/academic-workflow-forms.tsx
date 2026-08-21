"use client";

import { useActionState } from "react";

import { createAssignmentAction, createEnrollmentAction, gradeSubmissionAction, type AcademicActionState } from "@/features/academics/application/academic-workflow-actions";

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

export function EnrollmentCreator({ offerings, students }: { offerings: Array<{ id: string; label: string }>; students: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(createEnrollmentAction, initialState);
  return <form action={action} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
    <label className="text-xs font-semibold text-slate-600">Student<select className={`${field} mt-1`} name="studentId" required><option value="">Choose student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-600">Course offering<select className={`${field} mt-1`} name="offeringId" required><option value="">Choose offering</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <button className={button} disabled={pending} type="submit">{pending ? "Enrolling…" : "Enroll student"}</button>
    <div className="md:col-span-3"><Feedback state={state} /></div>
  </form>;
}
