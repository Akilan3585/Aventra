"use client";

import { CheckCheck, RotateCcw, Save, Search, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useRef, useState } from "react";

import { saveAttendanceSessionAction, type AttendanceSessionActionState } from "@/features/attendance/application/attendance-session-actions";
import {
  attendanceRemarksMaxLength,
  attendanceStatusLabels,
  attendanceStatusShortLabels,
  attendanceStatuses,
  summarizeAttendance,
  type AttendanceStatus,
} from "@/features/attendance/domain/attendance-rules";
import type { AttendanceRosterView } from "@/features/attendance/infrastructure/attendance-session.repository";
import { AttendanceFilters, type AttendanceSelection } from "@/features/attendance/presentation/attendance-filters";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";
import { formatCampusTime } from "@/lib/format-date";

type Entry = { remarks: string; status: AttendanceStatus | null };
type Entries = Record<string, Entry>;

const initialState: AttendanceSessionActionState = { message: "", status: "idle" };

const statusButtonTone: Record<AttendanceStatus, string> = {
  absent: "bg-rose-600 text-white ring-rose-600",
  excused: "bg-slate-600 text-white ring-slate-600",
  late: "bg-amber-500 text-white ring-amber-500",
  leave: "bg-violet-600 text-white ring-violet-600",
  od: "bg-sky-600 text-white ring-sky-600",
  permission: "bg-teal-600 text-white ring-teal-600",
  present: "bg-emerald-600 text-white ring-emerald-600",
};

function entriesFromView(view: AttendanceRosterView): Entries {
  return Object.fromEntries(view.students.map((student) => [
    student.studentId,
    { remarks: student.existing?.remarks ?? "", status: student.existing?.status ?? null },
  ]));
}

function sameEntries(left: Entries, right: Entries) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every((key) => right[key] && left[key].status === right[key].status && left[key].remarks === right[key].remarks);
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}

function ConfirmDialog({ confirmLabel, description, onCancel, onConfirm, title, tone = "primary" }: { confirmLabel: string; description: string; onCancel: () => void; onConfirm: () => void; title: string; tone?: "danger" | "primary" }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <button aria-label="Close dialog" className="absolute inset-0" onClick={onCancel} type="button" />
      <div aria-modal="true" className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button aria-label="Close dialog" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" onClick={onCancel} type="button"><X className="size-5" /></button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold" onClick={onCancel} type="button">Cancel</button>
          <button className={cn("rounded-xl px-5 py-2.5 text-sm font-semibold text-white", tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-blue-700")} onClick={onConfirm} type="button">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function AttendanceMarkingPanel({
  canManage,
  selection,
  view,
}: {
  canManage: boolean;
  selection: AttendanceSelection;
  view: AttendanceRosterView;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const selectionKey = `${selection.sessionDate}|${selection.session}|${selection.departmentCode ?? ""}|${selection.year ?? ""}`;
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(saveAttendanceSessionAction, initialState);
  const loaded = useMemo(() => entriesFromView(view), [view]);
  const students = view.students;
  const [entries, setEntries] = useState<Entries>(loaded);
  const [seededFrom, setSeededFrom] = useState(loaded);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unmarked" | AttendanceStatus>("all");
  const [confirmSave, setConfirmSave] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Re-seed the marks whenever the server sends a fresh roster or version (derived state, no effect).
  if (seededFrom !== loaded) {
    setSeededFrom(loaded);
    setEntries(loaded);
  }

  const dirty = !sameEntries(entries, loaded);
  const summary = useMemo(() => summarizeAttendance(students.map((student) => entries[student.studentId]?.status ?? null)), [entries, students]);
  const existingCount = students.filter((student) => student.existing).length;
  const showMessage = state.message && submittedKey === selectionKey;

  const visibleStudents = students.filter((student) => {
    const entry = entries[student.studentId];
    const matchesSearch = !search || `${student.studentName} ${student.registerNumber}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "unmarked" ? !entry?.status : entry?.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], status } }));
  const setRemarks = (studentId: string, remarks: string) =>
    setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], remarks: remarks.slice(0, attendanceRemarksMaxLength) } }));
  const markAll = (status: AttendanceStatus) =>
    setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, status }])));

  const canSave = canManage && students.length > 0 && summary.unmarked === 0 && dirty && !pending;
  const serialized = JSON.stringify(students.map((student) => ({
    remarks: entries[student.studentId]?.remarks ?? "",
    status: entries[student.studentId]?.status,
    studentId: student.studentId,
  })));
  const scopeLabel = [selection.departmentCode ?? "All departments", selection.year ? `${selection.year} Year` : "all years"].join(", ");

  const requestNavigation = (_href: string, proceed: () => void) => {
    if (pending) return;
    if (dirty) setPendingNavigation(() => proceed);
    else proceed();
  };

  return (
    <div className="mt-6 space-y-6">
      <AttendanceFilters departments={view.departments} dirty={dirty} onNavigate={requestNavigation} selection={selection} years={view.years} />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">{formatDate(selection.sessionDate)} · {selection.session}</h2>
            <p className="mt-1 text-sm text-slate-500">{students.length} student{students.length === 1 ? "" : "s"} · {scopeLabel}</p>
            {existingCount ? (
              <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                Attendance already recorded for {existingCount} of {students.length} students{view.lastSavedLabel ? ` · last saved ${view.lastSavedLabel}` : ""}. Changes will update the existing records.
              </p>
            ) : null}
          </div>
          <dl className="grid grid-cols-3 gap-x-5 gap-y-2 text-sm sm:grid-cols-4 lg:grid-cols-8">
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt><dd className="font-semibold text-slate-900">{summary.total}</dd></div>
            {(["present", "absent", "late", "od", "permission", "leave"] as const).map((status) => (
              <div key={status}><dt className="text-xs uppercase tracking-wide text-slate-500">{attendanceStatusShortLabels[status]}</dt><dd className="font-semibold text-slate-900">{summary.counts[status]}</dd></div>
            ))}
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">Attendance</dt><dd className={cn("font-semibold", summary.attendancePercent !== null && summary.attendancePercent < 75 ? "text-rose-700" : "text-emerald-700")}>{summary.attendancePercent === null ? "—" : `${summary.attendancePercent}%`}</dd></div>
          </dl>
        </div>
        {summary.unmarked > 0 ? <p className="mt-3 text-sm text-amber-700">{summary.unmarked} student{summary.unmarked === 1 ? " has" : "s have"} no status yet.</p> : null}
      </Card>

      {!students.length ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-slate-900">No students match this selection.</p>
          <p className="mt-1 text-sm text-slate-500">Students appear here as soon as they exist in the campus directory. Faculty see only students in their assigned classes.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={!canManage || pending} onClick={() => markAll("present")} type="button"><CheckCheck className="size-4" /> Mark all present</button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" disabled={!canManage || pending} onClick={() => markAll("absent")} type="button"><UserX className="size-4" /> Mark all absent</button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!canManage || pending || !dirty} onClick={() => setEntries(loaded)} type="button"><RotateCcw className="size-4" /> Reset</button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
                <Search className="size-4 text-slate-400" />
                <span className="sr-only">Search student</span>
                <input className="min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search student" type="search" value={search} />
              </label>
              <label className="text-sm">
                <span className="sr-only">Filter by status</span>
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
                  <option value="all">All statuses</option>
                  <option value="unmarked">Unmarked</option>
                  {attendanceStatuses.map((status) => <option key={status} value={status}>{attendanceStatusLabels[status]}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Register no</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Dept</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.map((student) => {
                  const entry = entries[student.studentId];
                  const serial = students.indexOf(student) + 1;
                  return (
                    <tr className={cn(!entry?.status && "bg-amber-50/40")} key={student.studentId}>
                      <td className="px-4 py-3 text-sm text-slate-500">{serial}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-700">{student.registerNumber}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{student.studentName}</p>
                        {student.membershipStatus && student.membershipStatus !== "active" ? <p className="text-xs text-slate-500">Membership {student.membershipStatus}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.department}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.year} (sem {student.semester})</td>
                      <td className="px-4 py-3">
                        <div aria-label={`Status for ${student.studentName}`} className="flex flex-wrap gap-1" role="radiogroup">
                          {attendanceStatuses.map((status) => (
                            <button
                              aria-checked={entry?.status === status}
                              className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition disabled:cursor-not-allowed", entry?.status === status ? statusButtonTone[status] : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}
                              disabled={!canManage || pending}
                              key={status}
                              onClick={() => setStatus(student.studentId, status)}
                              role="radio"
                              type="button"
                            >
                              {attendanceStatusShortLabels[status]}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Remarks for ${student.studentName}`}
                          className="w-44 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
                          disabled={!canManage || pending}
                          maxLength={attendanceRemarksMaxLength}
                          onChange={(event) => setRemarks(student.studentId, event.target.value)}
                          placeholder="Optional"
                          value={entry?.remarks ?? ""}
                        />
                      </td>
                    </tr>
                  );
                })}
                {!visibleStudents.length ? <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={7}>No students match the current search or filter.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" onSubmit={() => setSubmittedKey(selectionKey)} ref={formRef}>
            <input name="sessionDate" type="hidden" value={selection.sessionDate} />
            <input name="session" type="hidden" value={selection.session} />
            <input name="version" type="hidden" value={view.version} />
            <input name="entries" type="hidden" value={serialized} />
            <div className="min-w-0 flex-1">
              {showMessage ? (
                <p aria-live="polite" className={cn("rounded-xl px-4 py-3 text-sm", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                  {state.message}
                  {state.status === "success" && state.savedAt ? ` Saved at ${formatCampusTime(state.savedAt)}.` : ""}
                  {state.status === "conflict" ? <button className="ml-2 font-semibold underline" onClick={() => router.refresh()} type="button">Reload</button> : null}
                </p>
              ) : !canManage ? (
                <p className="text-sm text-slate-500">You can view this session but not change it.</p>
              ) : null}
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
              disabled={!canSave}
              onClick={() => setConfirmSave(true)}
              type="button"
            >
              <Save className="size-4" /> {pending ? "Saving…" : existingCount ? "Update attendance" : "Save attendance"}
            </button>
          </form>
        </Card>
      )}

      {confirmSave ? (
        <ConfirmDialog
          confirmLabel={existingCount ? "Update attendance" : "Save attendance"}
          description={`You are about to ${existingCount ? "update" : "record"} attendance for ${students.length} students (${scopeLabel}) for ${selection.session}, ${formatDate(selection.sessionDate)}. Present ${summary.counts.present}, absent ${summary.counts.absent}, late ${summary.counts.late}, OD ${summary.counts.od}, permission ${summary.counts.permission}, leave ${summary.counts.leave}.`}
          onCancel={() => setConfirmSave(false)}
          onConfirm={() => { setConfirmSave(false); formRef.current?.requestSubmit(); }}
          title="Confirm attendance"
        />
      ) : null}
      {pendingNavigation ? (
        <ConfirmDialog
          confirmLabel="Discard changes"
          description="You have unsaved attendance marks for this session. Leaving now will discard them."
          onCancel={() => setPendingNavigation(null)}
          onConfirm={() => { const proceed = pendingNavigation; setPendingNavigation(null); proceed(); }}
          title="Discard unsaved marks?"
          tone="danger"
        />
      ) : null}
    </div>
  );
}
