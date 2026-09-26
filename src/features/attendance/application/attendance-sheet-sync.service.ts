import "server-only";

import {
  attendanceSheetHeader,
  attendanceSheetTabs,
  auditSheetHeader,
  buildAttendanceRow,
  buildAuditRow,
  buildStudentRow,
  planSheetUpsert,
  studentsSheetHeader,
} from "@/features/attendance/domain/attendance-sheet";
import {
  listAttendanceAuditForMirror,
  listAttendanceRecordsForMirror,
  listStudentsForMirror,
} from "@/features/attendance/infrastructure/attendance-session.repository";
import {
  finishAttendanceSheetSync,
  startAttendanceSheetSync,
  type AttendanceSheetSyncTrigger,
} from "@/features/attendance/infrastructure/attendance-sheet-sync.repository";
import {
  appendSheetRows,
  ensureSheetTabsWithHeaders,
  GoogleSheetsError,
  readSheetIdColumn,
  resolveGoogleSheetsConfiguration,
  updateSheetRows,
  type SheetsConfiguration,
} from "@/server/google/sheets";

export type AttendanceSheetSyncOutcome =
  | { status: "not-configured" }
  | { status: "nothing-to-sync" }
  | { errorMessage: string; status: "failed"; syncId: string | null }
  | { recordsSynced: number; sheetsUpdated: number; status: "succeeded"; syncId: string };

export type AttendanceSheetSyncRequest = {
  /** Mirror only these records (after a save); omit for a full mirror. */
  recordIds?: readonly string[];
  trigger: AttendanceSheetSyncTrigger;
  triggeredByProfileId?: string | null;
};

/**
 * Mirrors Supabase attendance into the normalized `Attendance`, `Students`, and
 * `Attendance_Audit` tabs. Rows are matched on column A (the Supabase ids), so
 * re-running never duplicates a row. Every run is recorded in
 * `attendance_sheet_syncs`; the function never throws.
 */
export async function syncAttendanceToGoogleSheet(request: AttendanceSheetSyncRequest): Promise<AttendanceSheetSyncOutcome> {
  const config = resolveGoogleSheetsConfiguration();
  if (!config) return { status: "not-configured" };

  let syncId: string | null = null;
  try {
    const records = await listAttendanceRecordsForMirror({ recordIds: request.recordIds });
    const studentIds = request.recordIds ? [...new Set(records.map((record) => record.studentId))] : undefined;
    const [students, audits] = await Promise.all([
      listStudentsForMirror(studentIds),
      listAttendanceAuditForMirror(request.recordIds),
    ]);
    if (!records.length && !students.length) return { status: "nothing-to-sync" };

    syncId = await startAttendanceSheetSync({
      offeringIds: [],
      scope: request.recordIds ? "offering" : "full",
      spreadsheetId: config.spreadsheetId,
      trigger: request.trigger,
      triggeredByProfileId: request.triggeredByProfileId ?? null,
    });

    const sheetsUpdated = await writeMirror(config, { audits, records, students });
    await finishAttendanceSheetSync(syncId, { recordsSynced: records.length, sheetsUpdated, status: "succeeded" });
    return { recordsSynced: records.length, sheetsUpdated, status: "succeeded", syncId };
  } catch (error) {
    const errorMessage = error instanceof GoogleSheetsError
      ? error.message
      : error instanceof Error && error.name === "DatabaseQueryError"
        ? "Attendance data could not be loaded for the sheet mirror."
        : "Unexpected Google Sheets sync error.";
    if (syncId) await finishAttendanceSheetSync(syncId, { errorMessage, status: "failed" }).catch(() => undefined);
    return { errorMessage, status: "failed", syncId };
  }
}

type MirrorPayload = {
  audits: Awaited<ReturnType<typeof listAttendanceAuditForMirror>>;
  records: Awaited<ReturnType<typeof listAttendanceRecordsForMirror>>;
  students: Awaited<ReturnType<typeof listStudentsForMirror>>;
};

async function writeMirror(config: SheetsConfiguration, payload: MirrorPayload) {
  await ensureSheetTabsWithHeaders(config, [
    { header: attendanceSheetHeader, title: attendanceSheetTabs.attendance },
    { header: studentsSheetHeader, title: attendanceSheetTabs.students },
    { header: auditSheetHeader, title: attendanceSheetTabs.audit },
  ]);

  const [attendanceIds, studentIds, auditIds] = await Promise.all([
    readSheetIdColumn(config, attendanceSheetTabs.attendance),
    readSheetIdColumn(config, attendanceSheetTabs.students),
    readSheetIdColumn(config, attendanceSheetTabs.audit),
  ]);

  const attendancePlan = planSheetUpsert(attendanceIds, payload.records, (record) => record.id);
  const studentPlan = planSheetUpsert(studentIds, payload.students, (student) => student.studentId);
  // Audit rows are immutable: only rows the sheet has never seen are appended.
  const auditPlan = planSheetUpsert(auditIds, payload.audits, (event) => event.id);

  // Updates first, then appends, tab by tab: a failure part-way leaves earlier
  // tabs fully written and later tabs untouched, and the next run repairs it.
  await updateSheetRows(config, attendanceSheetTabs.attendance, attendancePlan.updates.map((update) => ({ rowNumber: update.rowNumber, values: buildAttendanceRow(update.item) })));
  await appendSheetRows(config, attendanceSheetTabs.attendance, attendancePlan.appends.map(buildAttendanceRow));
  await updateSheetRows(config, attendanceSheetTabs.students, studentPlan.updates.map((update) => ({ rowNumber: update.rowNumber, values: buildStudentRow(update.item) })));
  await appendSheetRows(config, attendanceSheetTabs.students, studentPlan.appends.map(buildStudentRow));
  await appendSheetRows(config, attendanceSheetTabs.audit, auditPlan.appends.map(buildAuditRow));

  return 3;
}

/** Best-effort mirror of freshly saved records; used by the save actions. */
export async function syncAttendanceSheetForRecords(recordIds: readonly string[], profileId: string | null) {
  if (!resolveGoogleSheetsConfiguration()) return "not-configured" as const;
  if (!recordIds.length) return "nothing-to-sync" as const;
  const outcome = await syncAttendanceToGoogleSheet({ recordIds, trigger: "record", triggeredByProfileId: profileId });
  return outcome.status;
}
