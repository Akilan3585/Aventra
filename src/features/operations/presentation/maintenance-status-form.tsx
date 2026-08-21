"use client";

import { useState } from "react";

import { updateMaintenanceStatusAction } from "@/features/operations/application/operations-actions";
import {
  maintenanceStatuses,
  maintenanceTransitionNeedsVerification,
  type MaintenanceStatus,
} from "@/features/operations/domain/operations-rules";

const labels: Record<MaintenanceStatus, string> = {
  assigned: "Assigned",
  closed: "Closed",
  in_progress: "In progress",
  open: "Open",
  resolved: "Resolved",
};

export function MaintenanceStatusForm({
  currentStatus,
  ticketId,
  title,
}: {
  currentStatus: MaintenanceStatus;
  ticketId: string;
  title: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const needsVerification = maintenanceTransitionNeedsVerification(status);

  return (
    <form action={updateMaintenanceStatusAction} className="mt-3 space-y-2">
      <input name="ticketId" type="hidden" value={ticketId} />
      <div className="flex gap-2">
        <select
          aria-label={`Update ${title} status`}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
          name="status"
          onChange={(event) => setStatus(event.target.value as MaintenanceStatus)}
          value={status}
        >
          {maintenanceStatuses.map((option) => (
            <option key={option} value={option}>{labels[option]}</option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white" type="submit">Save</button>
      </div>
      {needsVerification ? (
        <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-900">
          <input className="mt-0.5 size-3.5" name="resolutionVerified" required type="checkbox" />
          <span>I verified that service is restored and evidence is accurate.</span>
        </label>
      ) : null}
    </form>
  );
}
