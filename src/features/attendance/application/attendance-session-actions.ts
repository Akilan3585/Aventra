"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { evaluateAttendanceEmailAlert } from "@/features/attendance/application/attendance-alert.service";
import { syncAttendanceSheetForRecords } from "@/features/attendance/application/attendance-sheet-sync.service";
import {
  attendanceRemarksMaxLength,
  attendanceSessions,
  attendanceStatuses,
} from "@/features/attendance/domain/attendance-rules";
import { listSessionRecords, scopedStudentIds } from "@/features/attendance/infrastructure/attendance-session.repository";
import { isFutureCampusDate } from "@/features/operations/domain/operations-rules";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AttendanceSessionActionState = {
  message: string;
  savedAt?: string;
  sheet?: "failed" | "not-configured" | "nothing-to-sync" | "succeeded";
  status: "conflict" | "error" | "idle" | "success";
};

const entrySchema = z.object({
  remarks: z.string().trim().max(attendanceRemarksMaxLength),
  status: z.enum(attendanceStatuses),
  studentId: z.guid(),
});

const saveSchema = z.object({
  entries: z.array(entrySchema).min(1).max(2000),
  session: z.enum(attendanceSessions),
  sessionDate: z.iso.date(),
  /** Newest `updated_at` the client loaded; empty when no records existed. */
  version: z.string().max(64),
});

function errorState(message: string, status: AttendanceSessionActionState["status"] = "error"): AttendanceSessionActionState {
  return { message, status };
}

function parseEntries(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Saves the marked students for one date and session. Inserts are unique on
 * (student, date, session) so a retry or double submit can never duplicate a
 * record, and updates are refused when another user changed the session since
 * the page was loaded.
 */
export async function saveAttendanceSessionAction(
  _previous: AttendanceSessionActionState,
  formData: FormData,
): Promise<AttendanceSessionActionState> {
  let access;
  try {
    access = await requirePermission("attendance:record");
  } catch {
    return errorState("Sign in with attendance-recording permission.");
  }

  const parsed = saveSchema.safeParse({
    entries: parseEntries(formData.get("entries")),
    session: formData.get("session"),
    sessionDate: formData.get("sessionDate"),
    version: formData.get("version") ?? "",
  });
  if (!parsed.success) return errorState("Choose a date and period, and give every listed student a valid status.");
  const { entries, session, sessionDate, version } = parsed.data;
  if (isFutureCampusDate(sessionDate)) return errorState("Attendance cannot be recorded for a future date.");
  const submittedIds = entries.map((entry) => entry.studentId);
  if (new Set(submittedIds).size !== submittedIds.length) {
    return errorState("The submission lists a student more than once. Reload and try again.");
  }

  const client = createSupabaseAdminClient();
  try {
    // Never trust student ids from the browser: they must exist and be within the user's scope.
    const scoped = access.role === "faculty" ? await scopedStudentIds(access.profileId ?? undefined) ?? [] : null;
    if (scoped && submittedIds.some((id) => !scoped.includes(id))) {
      return errorState("You can record attendance only for students in your assigned classes.");
    }
    const known = await client.from("students").select("id").in("id", submittedIds);
    if (known.error) return errorState("The student list could not be verified.");
    if (known.data.length !== submittedIds.length) {
      return errorState("A submitted student no longer exists. Reload the list and try again.");
    }

    const existing = await listSessionRecords({ session, sessionDate }, submittedIds);
    const latest = existing.map((record) => record.updated_at).sort().at(-1) ?? "";
    if (latest !== version) {
      const changedAt = latest ? ` at ${new Date(latest).toLocaleString()}` : "";
      return errorState(
        `This session was changed by someone else${changedAt}. Reload to review the latest attendance before saving.`,
        "conflict",
      );
    }
    const existingByStudent = new Map(existing.map((record) => [record.student_id, record]));
    const now = new Date().toISOString();

    const inserts = entries.filter((entry) => !existingByStudent.has(entry.studentId)).map((entry) => ({
      recorded_by_profile_id: access.profileId,
      remarks: entry.remarks || null,
      session,
      session_date: sessionDate,
      status: entry.status,
      student_id: entry.studentId,
      updated_by_profile_id: access.profileId,
    }));
    const updates = entries.flatMap((entry) => {
      const record = existingByStudent.get(entry.studentId);
      if (!record) return [];
      const remarks = entry.remarks || null;
      if (record.status === entry.status && (record.remarks ?? null) === remarks) return [];
      return [{ entry, record }];
    });
    if (!inserts.length && !updates.length) {
      return { message: "No changes to save. Attendance for this session is already up to date.", savedAt: latest || undefined, status: "success" };
    }

    const insertedIds: string[] = [];
    if (inserts.length) {
      const inserted = await client.from("attendance_records").insert(inserts).select("id, student_id, status");
      if (inserted.error) {
        if (inserted.error.code === "23505") {
          return errorState("Another user saved this session at the same time. Reload to review before saving again.", "conflict");
        }
        return errorState("Attendance could not be saved.");
      }
      insertedIds.push(...inserted.data.map((row) => row.id));
      await client.from("audit_logs").insert(inserted.data.map((row) => ({
        action: "attendance.created",
        actor_profile_id: access.profileId,
        entity_id: row.id,
        entity_type: "attendance_record",
        metadata: { actor_clerk_id: access.userId, date: sessionDate, new_status: row.status, old_status: null, session, student_id: row.student_id },
      })));
    }

    const updatedIds: string[] = [];
    for (const { entry, record } of updates) {
      const updated = await client
        .from("attendance_records")
        .update({ remarks: entry.remarks || null, status: entry.status, updated_by_profile_id: access.profileId })
        .eq("id", record.id)
        .eq("updated_at", record.updated_at)
        .select("id");
      if (updated.error) return errorState("Attendance could not be updated; some changes may have been saved. Reload to review.");
      if (!updated.data.length) {
        return errorState("Another user changed this session while you were saving. Reload to review before saving again.", "conflict");
      }
      updatedIds.push(record.id);
      await client.from("audit_logs").insert({
        action: "attendance.updated",
        actor_profile_id: access.profileId,
        entity_id: record.id,
        entity_type: "attendance_record",
        metadata: { actor_clerk_id: access.userId, date: sessionDate, new_status: entry.status, old_status: record.status, session, student_id: entry.studentId },
      });
    }

    const changedIds = [...insertedIds, ...updatedIds];
    const changedStudents = [...inserts.map((row) => row.student_id), ...updates.map(({ entry }) => entry.studentId)];
    const [sheet] = await Promise.all([
      syncAttendanceSheetForRecords(changedIds, access.profileId),
      Promise.allSettled(changedStudents.map((studentId) => evaluateAttendanceEmailAlert(studentId))),
    ]);
    ["/attendance", "/students", "/dashboard", "/analytics", "/student-workspace"].forEach((path) => revalidatePath(path));

    const summary = `Saved attendance for ${entries.length} students (${insertedIds.length} new, ${updatedIds.length} updated).`;
    const sheetNote = sheet === "failed"
      ? " Saved to the database, but the Google Sheet mirror failed; the failed sync was recorded and will retry on the next scheduled run."
      : sheet === "not-configured" ? " Google Sheets mirroring is not configured." : " Google Sheet updated.";
    return { message: summary + sheetNote, savedAt: now, sheet, status: "success" };
  } catch {
    return errorState("Attendance could not be saved because the database request failed. Your entries are still on screen; try again.");
  }
}
