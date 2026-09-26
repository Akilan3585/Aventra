import "server-only";

import { isAutoSyncPlatform, platformProfileUrl, type AutoSyncPlatform } from "@/features/performance/domain/platform-metrics-parsers";
import { fetchPlatformMetrics, PlatformFetchError } from "@/features/performance/infrastructure/platform-metrics.client";
import {
  listStoredPlatformHandles,
  recordPlatformAudit,
  upsertPlatformSnapshot,
} from "@/features/performance/infrastructure/platform-performance.repository";

export type PlatformFetchOutcome =
  | { id: string; score: number; status: "saved" }
  | { message: string; status: "not-found" | "unavailable" };

const today = () => new Date().toISOString().slice(0, 10);

/** Fetches a student's live metrics for one platform and stores the snapshot. */
export async function fetchAndStorePlatformSnapshot(input: {
  actorProfileId: string | null;
  handle: string;
  platform: AutoSyncPlatform;
  studentId: string;
}): Promise<PlatformFetchOutcome> {
  try {
    const metrics = await fetchPlatformMetrics(input.platform, input.handle);
    const id = await upsertPlatformSnapshot({
      activityCount: metrics.activityCount,
      handle: input.handle,
      platform: input.platform,
      profileUrl: platformProfileUrl(input.platform, input.handle),
      recordedAt: today(),
      recordedByProfileId: input.actorProfileId,
      score: metrics.score,
      studentId: input.studentId,
      tier: metrics.tier,
    });
    return { id, score: metrics.score, status: "saved" };
  } catch (error) {
    if (error instanceof PlatformFetchError) return { message: error.message, status: error.reason };
    return { message: "The snapshot could not be saved.", status: "unavailable" };
  }
}

export type PlatformRefreshSummary = {
  failures: Array<{ handle: string; message: string; platform: string }>;
  skipped: number;
  updated: number;
};

/**
 * Re-fetches every stored GitHub, LeetCode, CodeChef, and HackerRank handle.
 * LinkedIn rows are manual and skipped. Runs three requests at a time so the
 * platforms are not flooded.
 */
export async function refreshAllPlatformSnapshots(actorProfileId: string | null, trigger: "manual" | "scheduled"): Promise<PlatformRefreshSummary> {
  const rows = await listStoredPlatformHandles();
  const summary: PlatformRefreshSummary = { failures: [], skipped: 0, updated: 0 };
  const queue = rows.filter((row) => {
    if (isAutoSyncPlatform(row.platform)) return true;
    summary.skipped += 1;
    return false;
  });

  const concurrency = 3;
  for (let index = 0; index < queue.length; index += concurrency) {
    const batch = queue.slice(index, index + concurrency);
    const outcomes = await Promise.all(batch.map((row) => fetchAndStorePlatformSnapshot({
      actorProfileId,
      handle: row.handle,
      platform: row.platform as AutoSyncPlatform,
      studentId: row.student_id,
    })));
    outcomes.forEach((outcome, position) => {
      if (outcome.status === "saved") summary.updated += 1;
      else summary.failures.push({ handle: batch[position].handle, message: outcome.message, platform: batch[position].platform });
    });
  }

  await recordPlatformAudit({
    action: "platform_profile.refreshed",
    actorProfileId,
    entityId: null,
    metadata: { failed: summary.failures.length, skipped: summary.skipped, trigger, updated: summary.updated },
  }).catch(() => undefined);
  return summary;
}
