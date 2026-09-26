"use server";

import { revalidatePath } from "next/cache";

import { syncAttendanceToGoogleSheet } from "@/features/attendance/application/attendance-sheet-sync.service";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AttendanceSheetActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

/**
 * Manual "Sync to Google Sheet" button: a full mirror of every student and record.
 */
export async function syncAttendanceSheetAction(): Promise<AttendanceSheetActionState> {
  try {
    const access = await requirePermission("attendance:record");
    const outcome = await syncAttendanceToGoogleSheet({ trigger: "manual", triggeredByProfileId: access.profileId });

    await createSupabaseAdminClient().from("audit_logs").insert({
      action: "attendance.sheet_synced",
      actor_profile_id: access.profileId,
      entity_id: "syncId" in outcome ? outcome.syncId : null,
      entity_type: "attendance_sheet_sync",
      metadata: { actor_clerk_id: access.userId, scope: "full", status: outcome.status },
    });
    revalidatePath("/attendance");

    if (outcome.status === "not-configured") {
      return { message: "Add the Google Sheets service-account settings to enable attendance sync.", status: "error" };
    }
    if (outcome.status === "nothing-to-sync") return { message: "No students or attendance records were found to sync.", status: "error" };
    if (outcome.status === "failed") return { message: `Google Sheets sync failed: ${outcome.errorMessage}`, status: "error" };
    return {
      message: `Synced ${outcome.recordsSynced} attendance records across ${outcome.sheetsUpdated} sheet tabs.`,
      status: "success",
    };
  } catch {
    return { message: "Sign in with attendance-recording permission.", status: "error" };
  }
}
