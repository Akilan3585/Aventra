import { BriefcaseBusiness, CalendarCheck, Clock3, GraduationCap, UserX } from "lucide-react";

import { OperationsHeader, OperationsMetrics, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import {
  defaultAttendanceSession,
  isAttendanceSession,
  type AttendanceSession,
} from "@/features/attendance/domain/attendance-rules";
import { loadAttendanceRoster, type AttendanceRosterView } from "@/features/attendance/infrastructure/attendance-session.repository";
import { getLatestAttendanceSheetSync, type AttendanceSheetSyncSummary } from "@/features/attendance/infrastructure/attendance-sheet-sync.repository";
import { AttendanceMarkingPanel } from "@/features/attendance/presentation/attendance-marking-panel";
import { AttendanceSheetSyncPanel } from "@/features/attendance/presentation/attendance-sheet-sync-panel";
import type { AttendanceSelection } from "@/features/attendance/presentation/attendance-filters";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadAttendanceWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { isGoogleSheetsConfigured } from "@/server/google/sheets";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSelection(params: Record<string, string | string[] | undefined>): AttendanceSelection {
  const today = new Date().toISOString().slice(0, 10);
  const date = first(params.date) ?? "";
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && date <= today ? date : today;
  const session = first(params.session);
  const department = (first(params.department) ?? "").trim().slice(0, 16);
  const year = (first(params.year) ?? "").trim().slice(0, 4);
  return {
    departmentCode: department || null,
    session: isAttendanceSession(session) ? session : (defaultAttendanceSession as AttendanceSession),
    sessionDate,
    year: year || null,
  };
}

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const [access, params] = await Promise.all([resolveWorkspaceAccess("students:read", "attendance:record"), searchParams]);
  const selection = resolveSelection(params);

  let workspace = null;
  let view: AttendanceRosterView | null = null;
  let latestSync: AttendanceSheetSyncSummary | null = null;
  if (access.mode === "live") {
    const facultyProfileId = access.role === "faculty" ? access.profileId ?? undefined : undefined;
    try {
      [workspace, view, latestSync] = await Promise.all([
        loadAttendanceWorkspace(facultyProfileId),
        loadAttendanceRoster(
          { session: selection.session, sessionDate: selection.sessionDate },
          { departmentCode: selection.departmentCode ?? undefined, year: selection.year ?? undefined },
          facultyProfileId,
        ),
        getLatestAttendanceSheetSync().catch(() => null),
      ]);
    } catch {
      view = null;
    }
  }
  const mode = access.mode === "live" && !view ? "error" : access.mode;
  const data = workspace ?? { absent: 0, attendanceRate: null, late: 0, onDuty: 0, todayRecorded: 0 };
  const belowPolicy = data.attendanceRate !== null && data.attendanceRate < campusPolicies.attendanceWarningPercent;

  return (
    <section aria-labelledby="attendance-heading">
      <OperationsHeader description="Pick a date and period, mark every student in one pass, and save to the campus record and the Google Sheet mirror." eyebrow="Academic operations" title="Attendance management." />
      <WorkspaceBanner mode={mode} />
      <OperationsMetrics metrics={[
        { detail: `Policy threshold is ${campusPolicies.attendanceWarningPercent}%`, icon: GraduationCap, label: "Attendance rate", value: data.attendanceRate === null ? "—" : `${data.attendanceRate}%` },
        { detail: "Records captured for the current date", icon: CalendarCheck, label: "Today recorded", value: data.todayRecorded },
        { detail: "Absence records in recent sessions", icon: UserX, label: "Absences", value: data.absent },
        { detail: "Late arrivals requiring trend review", icon: Clock3, label: "Late arrivals", value: data.late },
        { detail: "On-duty (OD) sessions counted as attended", icon: BriefcaseBusiness, label: "On duty", value: data.onDuty },
      ]} />
      {belowPolicy ? <Card className="mt-6 border-rose-200 bg-rose-50 p-5"><p className="text-sm font-semibold text-rose-800">Attendance is below the campus support threshold.</p><p className="mt-1 text-sm text-rose-700">Review repeated absences before running personalized guidance.</p></Card> : null}
      {mode === "live" && view ? (
        <>
          <AttendanceMarkingPanel canManage={access.canManage} selection={selection} view={view} />
          <AttendanceSheetSyncPanel canManage={access.canManage} configured={isGoogleSheetsConfigured()} latestSync={latestSync} />
        </>
      ) : null}
    </section>
  );
}
