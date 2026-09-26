"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fetchAndStorePlatformSnapshot } from "@/features/performance/application/platform-metrics-sync.service";
import {
  isAutoSyncPlatform,
  normalizeLinkedinProfile,
  normalizePlatformHandle,
} from "@/features/performance/domain/platform-metrics-parsers";
import { codingPlatforms, platformCatalog } from "@/features/performance/domain/platform-performance";
import {
  deletePlatformSnapshot,
  recordPlatformAudit,
  studentIdForProfile,
  upsertPlatformSnapshot,
} from "@/features/performance/infrastructure/platform-performance.repository";
import { requirePermission } from "@/server/auth/campus-access";

export type StudentPlatformActionState = { message: string; savedAt?: number; status: "idle" | "error" | "success" };

const failed = (message: string): StudentPlatformActionState => ({ message, status: "error" });
const succeeded = (message: string): StudentPlatformActionState => ({ message, savedAt: Date.now(), status: "success" });

const linkSchema = z.object({
  connections: z.string().trim().max(12),
  handle: z.string().trim().min(1).max(200),
  platform: z.enum(codingPlatforms),
});
const unlinkSchema = z.object({ platform: z.enum(codingPlatforms) });

/** LinkedIn tier label so admins can tell self-reported numbers from fetched ones. */
const selfReported = "Self-reported";

function refreshPages() {
  ["/student-workspace", "/performance", "/dashboard", "/analytics"].forEach((path) => revalidatePath(path));
}

/** Resolves the signed-in student's own student id; students can never act for someone else. */
async function currentStudent() {
  const access = await requirePermission("workspace:access");
  if (access.role !== "student" || !access.profileId) return { access, studentId: null };
  return { access, studentId: await studentIdForProfile(access.profileId) };
}

/**
 * A student links or updates one of their own profiles. GitHub, LeetCode,
 * CodeChef, and HackerRank numbers are fetched live; LinkedIn stores the link
 * and the connection count the student reports.
 */
export async function linkMyPlatformProfileAction(_: StudentPlatformActionState, formData: FormData): Promise<StudentPlatformActionState> {
  let context;
  try {
    context = await currentStudent();
  } catch {
    return failed("Sign in to your student account.");
  }
  if (!context.studentId) return failed("Your account is not linked to a student record yet. Ask your administrator.");

  const parsed = linkSchema.safeParse({
    connections: formData.get("connections") ?? "",
    handle: formData.get("handle"),
    platform: formData.get("platform"),
  });
  if (!parsed.success) return failed("Enter your username or profile link.");
  const { platform } = parsed.data;
  const label = platformCatalog[platform].label;
  const actorProfileId = context.access.profileId;

  try {
    if (isAutoSyncPlatform(platform)) {
      const handle = normalizePlatformHandle(platform, parsed.data.handle);
      if (!handle) return failed(`Enter your ${label} username or a link to your ${label} profile.`);
      const outcome = await fetchAndStorePlatformSnapshot({ actorProfileId, handle, platform, studentId: context.studentId });
      if (outcome.status !== "saved") return failed(outcome.message);
      await recordPlatformAudit({
        action: "platform_profile.self_linked",
        actorProfileId,
        entityId: outcome.id,
        metadata: { actor_clerk_id: context.access.userId, handle, platform, score: outcome.score, student_id: context.studentId },
      });
      refreshPages();
      return succeeded(`${label} saved as @${handle}. Your latest numbers were fetched.`);
    }

    const profile = normalizeLinkedinProfile(parsed.data.handle);
    if (!profile) return failed("Enter your public LinkedIn profile link, for example https://www.linkedin.com/in/your-name.");
    const connections = Number(parsed.data.connections);
    if (!parsed.data.connections || !Number.isInteger(connections) || connections < 0 || connections > 100_000) {
      return failed("Enter your LinkedIn connection count as a whole number (for 500+, enter 500).");
    }
    const id = await upsertPlatformSnapshot({
      activityCount: null,
      handle: profile.handle,
      platform,
      profileUrl: profile.profileUrl,
      recordedAt: new Date().toISOString().slice(0, 10),
      recordedByProfileId: actorProfileId,
      score: connections,
      studentId: context.studentId,
      tier: selfReported,
    });
    await recordPlatformAudit({
      action: "platform_profile.self_linked",
      actorProfileId,
      entityId: id,
      metadata: { actor_clerk_id: context.access.userId, handle: profile.handle, platform, score: connections, self_reported: true, student_id: context.studentId },
    });
    refreshPages();
    return succeeded("LinkedIn saved.");
  } catch {
    return failed("Your profile could not be saved. Try again.");
  }
}

export async function unlinkMyPlatformProfileAction(_: StudentPlatformActionState, formData: FormData): Promise<StudentPlatformActionState> {
  let context;
  try {
    context = await currentStudent();
  } catch {
    return failed("Sign in to your student account.");
  }
  if (!context.studentId) return failed("Your account is not linked to a student record yet.");
  const parsed = unlinkSchema.safeParse({ platform: formData.get("platform") });
  if (!parsed.success) return failed("Choose a platform to remove.");

  try {
    const id = await deletePlatformSnapshot(context.studentId, parsed.data.platform);
    await recordPlatformAudit({
      action: "platform_profile.self_unlinked",
      actorProfileId: context.access.profileId,
      entityId: id,
      metadata: { actor_clerk_id: context.access.userId, platform: parsed.data.platform, student_id: context.studentId },
    });
    refreshPages();
    return succeeded(`${platformCatalog[parsed.data.platform].label} removed.`);
  } catch {
    return failed("The profile could not be removed. Try again.");
  }
}
