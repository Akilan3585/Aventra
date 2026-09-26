import { NextResponse } from "next/server";

import { refreshAllPlatformSnapshots } from "@/features/performance/application/platform-metrics-sync.service";
import { isAuthorizedCronRequest } from "@/server/auth/cron-auth";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Nightly re-fetch of every linked GitHub, LeetCode, CodeChef, and HackerRank
 * profile. Called by Vercel Cron (vercel.json) or any scheduler with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  try {
    const summary = await refreshAllPlatformSnapshots(null, "scheduled");
    return NextResponse.json({
      failed: summary.failures.length,
      skipped: summary.skipped,
      timestamp: new Date().toISOString(),
      updated: summary.updated,
    });
  } catch {
    return NextResponse.json({ error: "Linked profiles could not be loaded." }, { status: 502 });
  }
}
