"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  fetchAndStorePlatformSnapshot,
  refreshAllPlatformSnapshots,
} from "@/features/performance/application/platform-metrics-sync.service";
import { isAutoSyncPlatform, normalizePlatformHandle } from "@/features/performance/domain/platform-metrics-parsers";
import { codingPlatforms, platformCatalog, platformProfileUrlIsValid } from "@/features/performance/domain/platform-performance";
import {
  recordPlatformAudit,
  studentExists,
  upsertPlatformSnapshot,
} from "@/features/performance/infrastructure/platform-performance.repository";
import { requirePermission } from "@/server/auth/campus-access";

export type PlatformPerformanceActionState = { message: string; status: "idle" | "error" | "success" };

const failed = (message: string): PlatformPerformanceActionState => ({ message, status: "error" });

function refreshPages() {
  ["/performance", "/students", "/dashboard", "/analytics"].forEach((path) => revalidatePath(path));
}

const linkSchema = z.object({
  handle: z.string().trim().min(1).max(200),
  platform: z.enum(codingPlatforms),
  studentId: z.guid(),
});

const linkedinSchema = z.object({
  activityCount: z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)]),
  handle: z.string().trim().min(1).max(80),
  profileUrl: z.url().trim(),
  score: z.coerce.number().min(0).max(1_000_000),
  tier: z.string().trim().max(40),
});

/**
 * Links a student's platform profile. GitHub, LeetCode, CodeChef, and HackerRank
 * metrics are fetched live from the platform; LinkedIn has no permitted
 * automated access, so its numbers are entered by hand.
 */
export async function recordPlatformProfileAction(_: PlatformPerformanceActionState, formData: FormData): Promise<PlatformPerformanceActionState> {
  let access;
  try {
    access = await requirePermission("campus:manage");
  } catch {
    return failed("Sign in with campus-management permission.");
  }

  const parsed = linkSchema.safeParse({
    handle: formData.get("handle"),
    platform: formData.get("platform"),
    studentId: formData.get("studentId"),
  });
  if (!parsed.success) return failed("Choose a student and platform, then enter the username or profile link.");
  const { platform, studentId } = parsed.data;
  const label = platformCatalog[platform].label;

  try {
    if (!(await studentExists(studentId))) return failed("That student no longer exists. Reload the page.");

    if (isAutoSyncPlatform(platform)) {
      const handle = normalizePlatformHandle(platform, parsed.data.handle);
      if (!handle) return failed(`Enter a ${label} username or a link to a ${label} profile.`);
      const outcome = await fetchAndStorePlatformSnapshot({ actorProfileId: access.profileId ?? null, handle, platform, studentId });
      if (outcome.status !== "saved") return failed(outcome.message);
      await recordPlatformAudit({
        action: "platform_profile.linked",
        actorProfileId: access.profileId ?? null,
        entityId: outcome.id,
        metadata: { actor_clerk_id: access.userId, handle, platform, score: outcome.score, student_id: studentId },
      });
      refreshPages();
      return { message: `${label} linked for @${handle}. Live metrics were fetched and saved.`, status: "success" };
    }

    const manual = linkedinSchema.safeParse({
      activityCount: formData.get("activityCount") ?? "",
      handle: parsed.data.handle.replace(/^@/, ""),
      profileUrl: formData.get("profileUrl"),
      score: formData.get("score"),
      tier: formData.get("tier") ?? "",
    });
    if (!manual.success) return failed("For LinkedIn, enter the handle, profile link, and connections count.");
    if (!platformProfileUrlIsValid(platform, manual.data.profileUrl)) return failed("The profile link must point at linkedin.com.");
    const id = await upsertPlatformSnapshot({
      activityCount: manual.data.activityCount === "" ? null : manual.data.activityCount,
      handle: manual.data.handle,
      platform,
      profileUrl: manual.data.profileUrl,
      recordedAt: new Date().toISOString().slice(0, 10),
      recordedByProfileId: access.profileId ?? null,
      score: manual.data.score,
      studentId,
      tier: manual.data.tier || null,
    });
    await recordPlatformAudit({
      action: "platform_profile.recorded",
      actorProfileId: access.profileId ?? null,
      entityId: id,
      metadata: { actor_clerk_id: access.userId, platform, score: manual.data.score, student_id: studentId },
    });
    refreshPages();
    return { message: "LinkedIn metrics recorded and the performance dashboard refreshed.", status: "success" };
  } catch {
    return failed("The profile could not be saved because the database request failed.");
  }
}

/** Re-fetches every linked GitHub, LeetCode, CodeChef, and HackerRank profile now. */
export async function refreshPlatformMetricsAction(): Promise<PlatformPerformanceActionState> {
  let access;
  try {
    access = await requirePermission("campus:manage");
  } catch {
    return failed("Sign in with campus-management permission.");
  }
  try {
    const summary = await refreshAllPlatformSnapshots(access.profileId ?? null, "manual");
    refreshPages();
    if (!summary.updated && !summary.failures.length) {
      return failed("No GitHub, LeetCode, CodeChef, or HackerRank profiles are linked yet. Link one first.");
    }
    const failures = summary.failures.slice(0, 3).map((item) => `${item.platform} @${item.handle}: ${item.message}`).join(" ");
    const more = summary.failures.length > 3 ? ` (${summary.failures.length - 3} more failed.)` : "";
    return {
      message: `Refreshed ${summary.updated} profile${summary.updated === 1 ? "" : "s"}.${summary.failures.length ? ` ${summary.failures.length} could not be fetched. ${failures}${more}` : ""}`,
      status: summary.failures.length && !summary.updated ? "error" : "success",
    };
  } catch {
    return failed("Linked profiles could not be loaded for refresh.");
  }
}
