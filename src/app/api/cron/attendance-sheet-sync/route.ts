import { NextResponse } from "next/server";

import { syncAttendanceToGoogleSheet } from "@/features/attendance/application/attendance-sheet-sync.service";
import { isAuthorizedCronRequest } from "@/server/auth/cron-auth";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export const dynamic = "force-dynamic";

/**
 * Scheduled full sync of attendance into the campus Google Sheet.
 * Vercel Cron (see vercel.json) and AWS EventBridge both call this with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const outcome = await syncAttendanceToGoogleSheet({ trigger: "scheduled" });
  const status = outcome.status === "failed" ? 502 : outcome.status === "not-configured" ? 503 : 200;
  return NextResponse.json({ outcome, timestamp: new Date().toISOString() }, { status });
}
