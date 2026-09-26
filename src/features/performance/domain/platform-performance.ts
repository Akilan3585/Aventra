export const codingPlatforms = ["linkedin", "hackerrank", "codechef", "leetcode", "github"] as const;

export type CodingPlatform = (typeof codingPlatforms)[number];

export type PlatformDefinition = {
  /** Categorical accent; the order in `codingPlatforms` is the validated palette order. */
  accent: string;
  activityLabel: string;
  hosts: readonly string[];
  label: string;
  scoreLabel: string;
  /** Scores at or below `floor` read as 0% readiness; at or above `ceiling` as 100%. */
  scoreScale: { ceiling: number; floor: number };
};

export const platformCatalog: Readonly<Record<CodingPlatform, PlatformDefinition>> = {
  linkedin: { accent: "#1d4ed8", activityLabel: "Skill endorsements", hosts: ["linkedin.com"], label: "LinkedIn", scoreLabel: "Connections", scoreScale: { ceiling: 500, floor: 0 } },
  hackerrank: { accent: "#f59e0b", activityLabel: "Badges", hosts: ["hackerrank.com"], label: "HackerRank", scoreLabel: "Points", scoreScale: { ceiling: 2500, floor: 0 } },
  codechef: { accent: "#9333ea", activityLabel: "Problems solved", hosts: ["codechef.com"], label: "CodeChef", scoreLabel: "Rating", scoreScale: { ceiling: 2500, floor: 1000 } },
  leetcode: { accent: "#0891b2", activityLabel: "Problems solved", hosts: ["leetcode.com", "leetcode.cn"], label: "LeetCode", scoreLabel: "Contest rating", scoreScale: { ceiling: 2600, floor: 1200 } },
  github: { accent: "#e11d48", activityLabel: "Public repositories", hosts: ["github.com"], label: "GitHub", scoreLabel: "Contributions (12 months)", scoreScale: { ceiling: 1000, floor: 0 } },
};

export const readinessBands = ["starter", "emerging", "developing", "advanced", "expert"] as const;
export type ReadinessBand = (typeof readinessBands)[number];

export function isCodingPlatform(value: unknown): value is CodingPlatform {
  return typeof value === "string" && codingPlatforms.includes(value as CodingPlatform);
}

/** Normalizes a platform's headline score onto a 0–100 readiness scale. */
export function platformReadiness(platform: CodingPlatform, score: number): number {
  const { ceiling, floor } = platformCatalog[platform].scoreScale;
  if (!Number.isFinite(score)) return 0;
  const ratio = (score - floor) / (ceiling - floor);
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

export function readinessBand(readiness: number): ReadinessBand {
  if (readiness >= 80) return "expert";
  if (readiness >= 60) return "advanced";
  if (readiness >= 40) return "developing";
  if (readiness >= 20) return "emerging";
  return "starter";
}

export function platformProfileUrlIsValid(platform: CodingPlatform, value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return platformCatalog[platform].hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export type PlatformProfileSnapshot = { platform: CodingPlatform; score: number; studentId: string };

export type StudentPlatformSummary = {
  compositeReadiness: number | null;
  linkedPlatforms: number;
  strongest: { platform: CodingPlatform; readiness: number } | null;
};

/** Averages readiness across the platforms a single student has linked. */
export function summarizeStudentPlatforms(profiles: readonly Pick<PlatformProfileSnapshot, "platform" | "score">[]): StudentPlatformSummary {
  const seen = new Map<CodingPlatform, number>();
  for (const profile of profiles) seen.set(profile.platform, platformReadiness(profile.platform, Number(profile.score)));
  if (!seen.size) return { compositeReadiness: null, linkedPlatforms: 0, strongest: null };
  let strongest: StudentPlatformSummary["strongest"] = null;
  let total = 0;
  for (const [platform, readiness] of seen) {
    total += readiness;
    if (!strongest || readiness > strongest.readiness) strongest = { platform, readiness };
  }
  return { compositeReadiness: Math.round(total / seen.size), linkedPlatforms: seen.size, strongest };
}

export type PlatformCoverage = {
  averageReadiness: number | null;
  averageScore: number | null;
  linkedStudents: number;
  platform: CodingPlatform;
};

/** Per-platform coverage across the campus, in catalog order. */
export function summarizePlatformCoverage(profiles: readonly PlatformProfileSnapshot[]): PlatformCoverage[] {
  return codingPlatforms.map((platform) => {
    const latestByStudent = new Map<string, number>();
    for (const profile of profiles) if (profile.platform === platform) latestByStudent.set(profile.studentId, Number(profile.score));
    const scores = [...latestByStudent.values()];
    if (!scores.length) return { averageReadiness: null, averageScore: null, linkedStudents: 0, platform };
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averageReadiness = scores.reduce((sum, score) => sum + platformReadiness(platform, score), 0) / scores.length;
    return { averageReadiness: Math.round(averageReadiness), averageScore: Math.round(averageScore), linkedStudents: scores.length, platform };
  });
}
