import { attendanceStatusLabels, type AttendanceStatus } from "./attendance-rules";

/**
 * Normalized Google Sheet layout: one row per attendance record, one row per
 * student, one row per audit event. Never one column per date, so the sheet
 * stays reporting-friendly as terms accumulate.
 */

export const attendanceSheetTabs = {
  attendance: "Attendance",
  audit: "Attendance_Audit",
  students: "Students",
} as const;

export const attendanceSheetHeader = [
  "Attendance ID",
  "Date",
  "Academic Year",
  "Department",
  "Year",
  "Section",
  "Class/Batch",
  "Session/Period",
  "Student ID",
  "Register Number",
  "Student Name",
  "Attendance Status",
  "Remarks",
  "Marked By",
  "Marked At",
  "Updated At",
] as const;

export const studentsSheetHeader = [
  "Student ID",
  "Register Number",
  "Student Name",
  "Department",
  "Year",
  "Section",
  "Class/Batch",
  "Status",
] as const;

export const auditSheetHeader = [
  "Audit ID",
  "Attendance ID",
  "Action",
  "User",
  "Timestamp",
  "Old Status",
  "New Status",
] as const;

export type SheetCell = string | number;

export type AttendanceMirrorRecord = {
  academicYear: string;
  classLabel: string;
  department: string;
  id: string;
  markedAt: string;
  markedBy: string;
  registerNumber: string;
  remarks: string | null;
  section: string;
  session: string;
  sessionDate: string;
  status: AttendanceStatus;
  studentId: string;
  studentName: string;
  updatedAt: string;
  year: string;
};

export type StudentMirrorRecord = {
  classLabel: string;
  department: string;
  registerNumber: string;
  section: string;
  status: "Active" | "Inactive";
  studentId: string;
  studentName: string;
  year: string;
};

export type AuditMirrorRecord = {
  action: "CREATE" | "UPDATE";
  attendanceId: string;
  id: string;
  newStatus: AttendanceStatus | null;
  oldStatus: AttendanceStatus | null;
  timestamp: string;
  user: string;
};

/** Sheets treats a leading =, +, - or @ as a formula; neutralise user text. */
export function sanitizeSheetText(value: string | null | undefined) {
  const text = (value ?? "").replace(/[\r\n\t]+/g, " ").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Date written as dd-mm-yyyy for readers; timestamps stay ISO. */
export function formatSheetDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}-${month}-${year}` : isoDate;
}

export function buildAttendanceRow(record: AttendanceMirrorRecord): SheetCell[] {
  return [
    record.id,
    formatSheetDate(record.sessionDate),
    record.academicYear,
    sanitizeSheetText(record.department),
    record.year,
    sanitizeSheetText(record.section),
    sanitizeSheetText(record.classLabel),
    sanitizeSheetText(record.session),
    record.studentId,
    sanitizeSheetText(record.registerNumber),
    sanitizeSheetText(record.studentName),
    attendanceStatusLabels[record.status],
    sanitizeSheetText(record.remarks),
    sanitizeSheetText(record.markedBy),
    record.markedAt,
    record.updatedAt,
  ];
}

export function buildStudentRow(student: StudentMirrorRecord): SheetCell[] {
  return [
    student.studentId,
    sanitizeSheetText(student.registerNumber),
    sanitizeSheetText(student.studentName),
    sanitizeSheetText(student.department),
    student.year,
    sanitizeSheetText(student.section),
    sanitizeSheetText(student.classLabel),
    student.status,
  ];
}

export function buildAuditRow(event: AuditMirrorRecord): SheetCell[] {
  return [
    event.id,
    event.attendanceId,
    event.action,
    sanitizeSheetText(event.user),
    event.timestamp,
    event.oldStatus ? attendanceStatusLabels[event.oldStatus] : "",
    event.newStatus ? attendanceStatusLabels[event.newStatus] : "",
  ];
}

export type SheetUpsertPlan<T> = {
  appends: T[];
  updates: Array<{ item: T; rowNumber: number }>;
};

/**
 * Splits items into in-place updates (id already present in column A) and
 * appends, so re-syncing never duplicates a row. `existingIds` is column A of
 * the tab, index 0 being the header row (row 1 in the sheet).
 */
export function planSheetUpsert<T>(
  existingIds: ReadonlyArray<string | undefined>,
  items: readonly T[],
  idOf: (item: T) => string,
): SheetUpsertPlan<T> {
  const rowById = new Map<string, number>();
  existingIds.forEach((id, index) => {
    if (index === 0 || !id || rowById.has(id)) return;
    rowById.set(id, index + 1);
  });
  const updates: SheetUpsertPlan<T>["updates"] = [];
  const appends: T[] = [];
  for (const item of items) {
    const rowNumber = rowById.get(idOf(item));
    if (rowNumber) updates.push({ item, rowNumber });
    else appends.push(item);
  }
  return { appends, updates };
}
