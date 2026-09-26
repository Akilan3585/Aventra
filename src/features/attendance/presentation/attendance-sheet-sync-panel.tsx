"use client";

import { RefreshCw, Sheet } from "lucide-react";
import { useActionState } from "react";

import { syncAttendanceSheetAction } from "@/features/attendance/application/attendance-sheet-actions";
import type { AttendanceSheetActionState } from "@/features/attendance/application/attendance-sheet-actions";
import type { AttendanceSheetSyncSummary } from "@/features/attendance/infrastructure/attendance-sheet-sync.repository";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";
import { formatCampusDateTime } from "@/lib/format-date";

const initialState: AttendanceSheetActionState = { message: "", status: "idle" };

const statusTone: Record<AttendanceSheetSyncSummary["status"], string> = {
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  running: "bg-amber-50 text-amber-700 ring-amber-200",
  succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function formatTimestamp(value: string) {
  return formatCampusDateTime(value);
}

export function AttendanceSheetSyncPanel({
  canManage,
  configured,
  latestSync,
}: {
  canManage: boolean;
  configured: boolean;
  latestSync: AttendanceSheetSyncSummary | null;
}) {
  const [state, action, pending] = useActionState(syncAttendanceSheetAction, initialState);

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sheet className="size-4 text-primary" />
            <h2 className="font-semibold text-slate-950">Google Sheet sync</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {configured
              ? "Each save mirrors the changed records into the Attendance, Students, and Attendance_Audit tabs. A full refresh also runs nightly."
              : "Add the Google Sheets service-account settings to mirror attendance into the campus spreadsheet."}
          </p>
          {latestSync ? (
            <p className="mt-3 text-sm text-slate-700">
              <span className={cn("mr-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset", statusTone[latestSync.status])}>
                {latestSync.status}
              </span>
              Last {latestSync.trigger} sync started {formatTimestamp(latestSync.startedAt)}
              {latestSync.status === "succeeded"
                ? ` · ${latestSync.recordsSynced} records across ${latestSync.sheetsUpdated} tabs`
                : latestSync.status === "failed" && latestSync.errorMessage
                  ? ` · ${latestSync.errorMessage}`
                  : ""}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No sync has run yet.</p>
          )}
        </div>
        {canManage ? (
          <form action={action} className="flex flex-col items-start gap-3 sm:items-end">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              disabled={pending || !configured}
              type="submit"
            >
              <RefreshCw className={cn("size-4", pending && "animate-spin")} />
              {pending ? "Syncing…" : "Sync to Google Sheet"}
            </button>
            {state.message ? (
              <p aria-live="polite" className={cn("rounded-xl px-4 py-3 text-sm", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                {state.message}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </Card>
  );
}
