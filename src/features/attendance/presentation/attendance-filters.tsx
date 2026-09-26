"use client";

import { useRouter } from "next/navigation";

import { attendanceSessions, type AttendanceSession } from "@/features/attendance/domain/attendance-rules";
import type { AttendanceDepartmentOption } from "@/features/attendance/infrastructure/attendance-session.repository";

export type AttendanceSelection = {
  departmentCode: string | null;
  session: AttendanceSession;
  sessionDate: string;
  year: string | null;
};

const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

export function buildAttendanceHref(selection: AttendanceSelection) {
  const params = new URLSearchParams();
  if (selection.departmentCode) params.set("department", selection.departmentCode);
  if (selection.year) params.set("year", selection.year);
  params.set("date", selection.sessionDate);
  params.set("session", selection.session);
  return `/attendance?${params.toString()}`;
}

/** Date and period pick the session; department and year only narrow the student list. */
export function AttendanceFilters({
  departments,
  dirty,
  onNavigate,
  selection,
  years,
}: {
  departments: AttendanceDepartmentOption[];
  dirty: boolean;
  /** Called before navigating so the panel can confirm discarding unsaved marks. */
  onNavigate: (href: string, proceed: () => void) => void;
  selection: AttendanceSelection;
  years: string[];
}) {
  const router = useRouter();
  const navigate = (next: AttendanceSelection) => {
    const href = buildAttendanceHref(next);
    onNavigate(href, () => router.push(href));
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
      <label className="text-sm font-medium text-slate-700">
        Date
        <input
          className={fieldClass}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) => event.target.value && navigate({ ...selection, sessionDate: event.target.value })}
          type="date"
          value={selection.sessionDate}
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Session / period
        <select className={fieldClass} onChange={(event) => navigate({ ...selection, session: event.target.value as AttendanceSession })} value={selection.session}>
          {attendanceSessions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Department
        <select className={fieldClass} onChange={(event) => navigate({ ...selection, departmentCode: event.target.value || null, year: null })} value={selection.departmentCode ?? ""}>
          <option value="">All departments</option>
          {departments.map((item) => <option key={item.id} value={item.code}>{item.code} · {item.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Year
        <select className={fieldClass} onChange={(event) => navigate({ ...selection, year: event.target.value || null })} value={selection.year ?? ""}>
          <option value="">All years</option>
          {years.map((item) => <option key={item} value={item}>{item} Year</option>)}
        </select>
      </label>
      {dirty ? <p className="text-xs text-amber-700 sm:col-span-2 lg:col-span-4">You have unsaved marks. Changing the date, period, or filters will ask before discarding them.</p> : null}
    </div>
  );
}
