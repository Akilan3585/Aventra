import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import type { Database } from "@/types/database";

export type AttendanceSheetSyncRow = Database["public"]["Tables"]["attendance_sheet_syncs"]["Row"];
export type AttendanceSheetSyncTrigger = "manual" | "record" | "scheduled";
export type AttendanceSheetSyncScope = "full" | "offering";
export type AttendanceSheetSyncStatus = "failed" | "running" | "succeeded";

export type AttendanceSheetSyncSummary = {
  errorMessage: string | null;
  finishedAt: string | null;
  id: string;
  recordsSynced: number;
  scope: AttendanceSheetSyncScope;
  sheetsUpdated: number;
  startedAt: string;
  status: AttendanceSheetSyncStatus;
  trigger: AttendanceSheetSyncTrigger;
};

function toSummary(row: AttendanceSheetSyncRow): AttendanceSheetSyncSummary {
  return {
    errorMessage: row.error_message,
    finishedAt: row.finished_at,
    id: row.id,
    recordsSynced: row.records_synced,
    scope: row.scope as AttendanceSheetSyncScope,
    sheetsUpdated: row.sheets_updated,
    startedAt: row.started_at,
    status: row.status as AttendanceSheetSyncStatus,
    trigger: row.trigger as AttendanceSheetSyncTrigger,
  };
}

export async function startAttendanceSheetSync(input: {
  offeringIds: readonly string[];
  scope: AttendanceSheetSyncScope;
  spreadsheetId: string;
  trigger: AttendanceSheetSyncTrigger;
  triggeredByProfileId: string | null;
}) {
  const { data, error } = await createSupabaseAdminClient()
    .from("attendance_sheet_syncs")
    .insert({
      offering_ids: [...input.offeringIds],
      scope: input.scope,
      spreadsheet_id: input.spreadsheetId,
      trigger: input.trigger,
      triggered_by_profile_id: input.triggeredByProfileId,
    })
    .select("id")
    .single();
  if (error) throw new DatabaseQueryError("start attendance sheet sync", error.message);
  return data.id;
}

export async function finishAttendanceSheetSync(
  syncId: string,
  outcome:
    | { recordsSynced: number; sheetsUpdated: number; status: "succeeded" }
    | { errorMessage: string; status: "failed" },
) {
  const { error } = await createSupabaseAdminClient()
    .from("attendance_sheet_syncs")
    .update({
      error_message: outcome.status === "failed" ? outcome.errorMessage.slice(0, 1000) : null,
      finished_at: new Date().toISOString(),
      records_synced: outcome.status === "succeeded" ? outcome.recordsSynced : 0,
      sheets_updated: outcome.status === "succeeded" ? outcome.sheetsUpdated : 0,
      status: outcome.status,
    })
    .eq("id", syncId);
  if (error) throw new DatabaseQueryError("finish attendance sheet sync", error.message);
}

export async function getLatestAttendanceSheetSync(): Promise<AttendanceSheetSyncSummary | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("attendance_sheet_syncs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DatabaseQueryError("load latest attendance sheet sync", error.message);
  return data ? toSummary(data) : null;
}
