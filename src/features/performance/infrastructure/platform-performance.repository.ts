import "server-only";

import type { CodingPlatform } from "@/features/performance/domain/platform-performance";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

function assertQuery(error: { message: string } | null, operation: string) {
  if (error) throw new DatabaseQueryError(operation, error.message);
}

export async function loadPlatformPerformanceWorkspace() {
  const client = createSupabaseAdminClient();
  const [profiles, students] = await Promise.all([
    client
      .from("student_platform_profiles")
      .select("id, student_id, platform, handle, profile_url, score, activity_count, tier, recorded_at, updated_at, students (student_number, semester, profiles (display_name), departments (code))")
      .order("updated_at", { ascending: false })
      .limit(2000),
    client.from("students").select("id").limit(10000),
  ]);
  assertQuery(profiles.error, "load student platform profiles");
  assertQuery(students.error, "load platform students");
  return { profiles: profiles.data ?? [], totalStudents: students.data?.length ?? 0 };
}

export type PlatformPerformanceWorkspace = Awaited<ReturnType<typeof loadPlatformPerformanceWorkspace>>;
export type PlatformProfileRecord = PlatformPerformanceWorkspace["profiles"][number];

export type PlatformSnapshotInput = {
  activityCount: number | null;
  handle: string;
  platform: CodingPlatform;
  profileUrl: string;
  recordedAt: string;
  recordedByProfileId: string | null;
  score: number;
  studentId: string;
  tier: string | null;
};

/** One row per student per platform; saving again replaces the snapshot. */
export async function upsertPlatformSnapshot(input: PlatformSnapshotInput) {
  const { data, error } = await createSupabaseAdminClient()
    .from("student_platform_profiles")
    .upsert(
      {
        activity_count: input.activityCount,
        handle: input.handle,
        platform: input.platform,
        profile_url: input.profileUrl,
        recorded_at: input.recordedAt,
        recorded_by_profile_id: input.recordedByProfileId,
        score: input.score,
        student_id: input.studentId,
        tier: input.tier,
      },
      { onConflict: "student_id,platform" },
    )
    .select("id")
    .single();
  assertQuery(error, "save platform snapshot");
  return data!.id;
}

/** Every stored handle, used by the refresh button and the nightly cron. */
export async function listStoredPlatformHandles() {
  const { data, error } = await createSupabaseAdminClient()
    .from("student_platform_profiles")
    .select("id, student_id, platform, handle")
    .order("updated_at", { ascending: true });
  assertQuery(error, "list platform handles");
  return data ?? [];
}

export async function studentExists(studentId: string) {
  const { data, error } = await createSupabaseAdminClient().from("students").select("id").eq("id", studentId).maybeSingle();
  assertQuery(error, "verify student");
  return Boolean(data);
}

export async function recordPlatformAudit(entry: {
  action: string;
  actorProfileId: string | null;
  entityId: string | null;
  metadata: Record<string, string | number | boolean | null>;
}) {
  await createSupabaseAdminClient().from("audit_logs").insert({
    action: entry.action,
    actor_profile_id: entry.actorProfileId,
    entity_id: entry.entityId,
    entity_type: "student_platform_profile",
    metadata: entry.metadata,
  });
}

/** The student row linked to a signed-in student's campus profile. */
export async function studentIdForProfile(profileId: string) {
  const { data, error } = await createSupabaseAdminClient().from("students").select("id").eq("profile_id", profileId).maybeSingle();
  assertQuery(error, "resolve student for profile");
  return data?.id ?? null;
}

export async function listPlatformSnapshotsForStudent(studentId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("student_platform_profiles")
    .select("id, platform, handle, profile_url, score, activity_count, tier, recorded_at, updated_at")
    .eq("student_id", studentId)
    .order("platform");
  assertQuery(error, "load student platform snapshots");
  return data ?? [];
}

export type StudentPlatformSnapshot = Awaited<ReturnType<typeof listPlatformSnapshotsForStudent>>[number];

export async function deletePlatformSnapshot(studentId: string, platform: CodingPlatform) {
  const { data, error } = await createSupabaseAdminClient()
    .from("student_platform_profiles")
    .delete()
    .eq("student_id", studentId)
    .eq("platform", platform)
    .select("id");
  assertQuery(error, "remove platform snapshot");
  return data?.[0]?.id ?? null;
}
