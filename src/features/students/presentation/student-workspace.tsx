"use client";

import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Download,
  GraduationCap,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Card } from "@/design-system/primitives/card";
import {
  createStudentAction,
  initialCreateStudentState,
} from "@/features/students/application/student-actions";
import type {
  DepartmentOption,
  StudentDirectoryItem,
} from "@/features/students/infrastructure/student.repository";
import type { RiskLevel } from "@/features/students/domain/student-success";
import { cn } from "@/lib/utils";

type WorkspaceMode = "configuration" | "error" | "forbidden" | "live";

type StudentWorkspaceProps = {
  canManage: boolean;
  departments: DepartmentOption[];
  mode: WorkspaceMode;
  students: StudentDirectoryItem[];
};

const riskLabels: Record<RiskLevel, string> = {
  high: "High priority",
  medium: "Monitor",
  low: "On track",
  "insufficient-data": "Needs data",
};

const riskStyles: Record<RiskLevel, string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "insufficient-data": "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function downloadRoster(students: StudentDirectoryItem[]) {
  const escape = (value: string | number | null) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = students.map((student) => [
    student.studentNumber,
    student.displayName,
    student.email,
    student.departmentCode,
    student.semester,
    student.enrollmentCount,
    student.attendanceRate,
    student.academicAverage,
    student.latestCgpa,
    riskLabels[student.riskLevel],
  ]);
  const csv = [
    ["Student ID", "Name", "Email", "Department", "Semester", "Enrollments", "Attendance", "Academic average", "CGPA", "Support status"],
    ...rows,
  ].map((row) => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `aventra-student-roster-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", riskStyles[level])}>
      {riskLabels[level]}
    </span>
  );
}

function AddStudentDialog({
  departments,
  onClose,
}: {
  departments: DepartmentOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createStudentAction,
    initialCreateStudentState,
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <button aria-label="Close add student dialog" className="absolute inset-0" onClick={onClose} type="button" />
      <div aria-labelledby="add-student-title" aria-modal="true" className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8" role="dialog">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-primary">Registrar workflow</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950" id="add-student-title">Add a student</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Create the academic identity now. The Clerk account can be linked when the student is invited.</p>
          </div>
          <button aria-label="Close dialog" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onClose} type="button"><X className="size-5" /></button>
        </div>
        <form action={formAction} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input autoFocus className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" maxLength={120} name="displayName" placeholder="Ananya Rao" required />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Campus email</span>
            <input className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" name="email" placeholder="ananya@campus.edu" required type="email" />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Student ID</span>
            <input className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm uppercase outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" maxLength={40} name="studentNumber" placeholder="CSE-2026-001" required />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Department</span>
            <select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" name="departmentId" required>
              <option value="">Select department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.code} — {department.name}</option>)}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Admission year</span>
            <input className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" defaultValue={new Date().getFullYear()} max={new Date().getFullYear() + 1} min="2000" name="admissionYear" required type="number" />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Current semester</span>
            <input className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" defaultValue="1" max="16" min="1" name="semester" required type="number" />
          </label>
          <div className="sm:col-span-2" aria-live="polite">
            {state.message ? <p className={cn("rounded-xl px-4 py-3 text-sm", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{state.message}</p> : null}
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">{state.status === "success" ? "Done" : "Cancel"}</button>
            {state.status !== "success" ? <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60" disabled={pending || departments.length === 0} type="submit">{pending ? "Adding…" : "Add student"}</button> : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export function StudentWorkspace({ canManage, departments, mode, students }: StudentWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students
      .filter((student) => riskFilter === "all" || student.riskLevel === riskFilter)
      .filter((student) => !normalizedQuery || [student.displayName, student.studentNumber, student.email ?? "", student.departmentCode].some((value) => value.toLowerCase().includes(normalizedQuery)))
      .sort((left, right) => (right.riskScore ?? -1) - (left.riskScore ?? -1));
  }, [query, riskFilter, students]);
  const needsAttention = students.filter((student) => ["high", "medium"].includes(student.riskLevel)).length;
  const activeEnrollments = students.reduce((sum, student) => sum + student.enrollmentCount, 0);
  const guidanceQueue = students.filter((student) => student.riskLevel === "high").length;

  return (
    <section aria-labelledby="students-heading">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Academic intelligence</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl" id="students-heading">Student success command center.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Prioritize support using live roster, attendance, assessment, and result signals—with every risk score kept explainable.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50" disabled={!students.length} onClick={() => downloadRoster(filteredStudents)} type="button"><Download className="size-4" /> Export view</button>
          {canManage ? <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700" onClick={() => setIsAddOpen(true)} type="button"><Plus className="size-4" /> Add student</button> : null}
        </div>
      </div>

      {mode !== "live" ? <Card className="mt-8 border-amber-200 bg-amber-50/70 p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm"><ShieldCheck className="size-5" /></span><div><h2 className="font-semibold text-slate-950">{mode === "configuration" ? "Connect secure data access" : mode === "forbidden" ? "This workspace is role protected" : "Student data is temporarily unavailable"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{mode === "configuration" ? "Add the Clerk publishable and secret keys, your email in CAMPUS_ADMIN_EMAILS, and the server-only SUPABASE_SECRET_KEY to .env.local. Restart the dev server, sign in, and this workspace will load live campus records." : mode === "forbidden" ? "Your signed-in campus role does not include students:read. Ask a campus administrator to set privateMetadata.campusRole in Clerk." : "The application is configured, but the roster query failed. Verify the Supabase project URL and server secret key."}</p></div></div></Card> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { detail: "Verified roster records", icon: UsersRound, label: "Total students", value: students.length },
          { detail: "High and monitored cases", icon: AlertTriangle, label: "Needs attention", value: needsAttention },
          { detail: "Current course relationships", icon: BookOpen, label: "Active enrollments", value: activeEnrollments },
          { detail: "High-priority human review", icon: Sparkles, label: "Guidance queue", value: guidanceQueue },
        ].map(({ detail, icon: MetricIcon, label, value }) => <Card className="p-5" key={label}><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p></div><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-primary"><MetricIcon className="size-4" /></span></div><p className="mt-4 text-xs leading-5 text-slate-500">{detail}</p></Card>)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-base font-semibold text-slate-950">Priority roster</h2><p className="mt-1 text-sm text-slate-500">Sorted by calculated support risk, highest first.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-72"><Search className="size-4 shrink-0 text-slate-400" /><span className="sr-only">Search student directory</span><input className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, email, department" type="search" value={query} /></label>
              <select aria-label="Filter by support status" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none" onChange={(event) => setRiskFilter(event.target.value as "all" | RiskLevel)} value={riskFilter}><option value="all">All statuses</option><option value="high">High priority</option><option value="medium">Monitor</option><option value="low">On track</option><option value="insufficient-data">Needs data</option></select>
            </div>
          </div>
          {filteredStudents.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Student</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Attendance</th><th className="px-4 py-3">Academic</th><th className="px-4 py-3">CGPA</th><th className="px-4 py-3">Support status</th><th className="px-4 py-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-slate-100">{filteredStudents.map((student) => <tr className="transition hover:bg-blue-50/30" key={student.id}><td className="px-6 py-4"><p className="font-semibold text-slate-900">{student.displayName}</p><p className="mt-0.5 font-mono text-xs text-slate-500">{student.studentNumber}</p></td><td className="px-4 py-4"><p className="text-sm font-medium text-slate-700">{student.departmentCode} · Sem {student.semester}</p><p className="mt-0.5 text-xs text-slate-500">{student.enrollmentCount} enrollments</p></td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatPercent(student.attendanceRate)}</td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatPercent(student.academicAverage)}</td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{student.latestCgpa?.toFixed(2) ?? "—"}</td><td className="px-4 py-4"><RiskBadge level={student.riskLevel} /><p className="mt-1.5 max-w-48 text-xs text-slate-500">{student.reasons[0]}</p></td><td className="px-4 py-4 text-slate-400"><ChevronRight className="size-4" /></td></tr>)}</tbody></table></div> : <div className="grid min-h-80 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-primary"><GraduationCap className="size-6" /></span><h3 className="mt-5 text-base font-semibold text-slate-950">{students.length ? "No students match this view." : "No roster records yet."}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{students.length ? "Adjust the search or support-status filter." : mode === "live" ? "Add the first student to activate enrollment and success workflows." : "Complete the secure configuration above to load live records."}</p></div></div>}
        </Card>

        <div className="space-y-6">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-white text-primary shadow-sm"><Sparkles className="size-5" /></span><p className="mt-5 text-sm font-semibold text-slate-950">Explainable Success Agent</p><p className="mt-2 text-sm leading-6 text-slate-600">Risk combines attendance (45%), assessment performance (35%), and CGPA (20%), reweighting only across signals that exist.</p><div className="mt-5 rounded-xl border border-blue-100 bg-white/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Human review rule</p><p className="mt-2 text-sm text-slate-700">No outreach is sent automatically. High-priority guidance remains queued for faculty approval.</p></div></Card>
          <Card className="p-5 sm:p-6"><p className="text-sm font-semibold text-slate-950">Signal health</p><div className="mt-5 space-y-4">{[{ label: "Attendance connected", value: students.filter((student) => student.attendanceRate !== null).length }, { label: "Assessments connected", value: students.filter((student) => student.academicAverage !== null).length }, { label: "Results connected", value: students.filter((student) => student.latestCgpa !== null).length }].map((signal) => <div className="flex items-center justify-between gap-4" key={signal.label}><span className="text-sm text-slate-600">{signal.label}</span><span className="font-mono text-sm font-semibold text-slate-900">{signal.value}/{students.length}</span></div>)}</div></Card>
        </div>
      </div>
      {isAddOpen ? <AddStudentDialog departments={departments} onClose={() => setIsAddOpen(false)} /> : null}
    </section>
  );
}
