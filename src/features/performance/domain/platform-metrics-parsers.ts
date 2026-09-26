import { platformProfileUrlIsValid, type CodingPlatform } from "./platform-performance";

/**
 * Pure parsing for automatically fetched platform metrics. The network calls
 * live in infrastructure/platform-metrics.client.ts; everything here is
 * deterministic and unit-tested against the public response shapes.
 *
 * LinkedIn is deliberately absent: it requires sign-in and its terms forbid
 * automated collection, so LinkedIn numbers stay manually recorded.
 */

export const autoSyncPlatforms = ["github", "leetcode", "codechef", "hackerrank"] as const;
export type AutoSyncPlatform = (typeof autoSyncPlatforms)[number];

export function isAutoSyncPlatform(platform: CodingPlatform): platform is AutoSyncPlatform {
  return (autoSyncPlatforms as readonly string[]).includes(platform);
}

export type FetchedPlatformMetrics = {
  activityCount: number | null;
  score: number;
  tier: string | null;
};

const handlePattern = /^[A-Za-z0-9_.-]{1,40}$/;

/** Path prefixes that precede the username in each platform's profile URL. */
const profilePathPrefixes: Readonly<Record<AutoSyncPlatform, readonly string[]>> = {
  codechef: ["users"],
  github: [],
  hackerrank: ["profile"],
  leetcode: ["u"],
};

/**
 * Accepts a bare username or a profile link and returns the username, or null
 * when it is not a valid handle for that platform. The strict pattern also
 * keeps user input from altering the URLs the client builds.
 */
export function normalizePlatformHandle(platform: AutoSyncPlatform, input: string): string | null {
  const value = input.trim().replace(/^@/, "");
  if (!value) return null;
  if (!/^https?:\/\//i.test(value) && !value.includes("/")) return handlePattern.test(value) ? value : null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (!platformProfileUrlIsValid(platform, withProtocol)) return null;
  const segments = new URL(withProtocol).pathname.split("/").filter(Boolean);
  const prefixes = profilePathPrefixes[platform];
  const candidate = segments[0] && prefixes.includes(segments[0].toLowerCase()) ? segments[1] : segments[0];
  return candidate && handlePattern.test(candidate) ? candidate : null;
}

export function platformProfileUrl(platform: AutoSyncPlatform, handle: string) {
  const encoded = encodeURIComponent(handle);
  switch (platform) {
    case "github": return `https://github.com/${encoded}`;
    case "leetcode": return `https://leetcode.com/u/${encoded}/`;
    case "codechef": return `https://www.codechef.com/users/${encoded}`;
    case "hackerrank": return `https://www.hackerrank.com/profile/${encoded}`;
  }
}

function toInteger(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

/** "3,815 contributions in the last year" from github.com/users/{u}/contributions. */
export function parseGithubContributions(html: string): number | null {
  const match = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i);
  return toInteger(match?.[1]);
}

export function buildGithubMetrics(user: { public_repos?: unknown }, contributions: number | null): FetchedPlatformMetrics {
  const repos = typeof user.public_repos === "number" ? user.public_repos : null;
  return { activityCount: repos, score: contributions ?? 0, tier: null };
}

type LeetcodeResponse = {
  data?: {
    matchedUser?: {
      profile?: { ranking?: number | null } | null;
      submitStatsGlobal?: { acSubmissionNum?: Array<{ count?: number; difficulty?: string }> } | null;
    } | null;
    userContestRanking?: { rating?: number | null; topPercentage?: number | null } | null;
  };
};

/** Returns null when LeetCode reports the user does not exist. */
export function parseLeetcodeProfile(payload: unknown): FetchedPlatformMetrics | null {
  const data = (payload as LeetcodeResponse | null)?.data;
  const user = data?.matchedUser;
  if (!user) return null;
  const solved = user.submitStatsGlobal?.acSubmissionNum?.find((item) => item.difficulty === "All")?.count;
  const rating = data?.userContestRanking?.rating;
  const top = data?.userContestRanking?.topPercentage;
  const ranking = user.profile?.ranking;
  return {
    activityCount: typeof solved === "number" ? solved : null,
    score: typeof rating === "number" ? Math.round(rating) : 0,
    tier: typeof top === "number" ? `Top ${top}%` : typeof ranking === "number" ? `Rank ${ranking.toLocaleString("en-IN")}` : null,
  };
}

/** Returns null when the page is not a CodeChef profile (unknown user or changed layout). */
export function parseCodechefProfile(html: string): FetchedPlatformMetrics | null {
  const rating = toInteger(html.match(/class="rating-number"[^>]*>\s*(\d+)/)?.[1]);
  const solved = toInteger(html.match(/Total\s+Problems\s+Solved:\s*(\d+)/i)?.[1]);
  if (rating === null && solved === null) return null;
  const starsBlock = html.match(/class="rating-star"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
  const stars = (starsBlock.match(/&#9733;|★/g) ?? []).length;
  return { activityCount: solved, score: rating ?? 0, tier: stars ? `${stars}★` : null };
}

type HackerrankBadges = {
  models?: Array<{ badge_name?: string; stars?: number; total_points?: number; total_stars?: number }>;
};

export function parseHackerrankBadges(payload: unknown): FetchedPlatformMetrics {
  const badges = (payload as HackerrankBadges | null)?.models ?? [];
  let points = 0;
  let best: { name: string; stars: number } | null = null;
  for (const badge of badges) {
    points += typeof badge.total_points === "number" ? badge.total_points : 0;
    const stars = typeof badge.stars === "number" ? badge.stars : typeof badge.total_stars === "number" ? badge.total_stars : 0;
    if (badge.badge_name && stars > 0 && (!best || stars > best.stars)) best = { name: badge.badge_name, stars };
  }
  return {
    activityCount: badges.length,
    score: Math.round(points),
    tier: best ? `${best.name} ${best.stars}★` : null,
  };
}

const linkedinSlugPattern = /^[A-Za-z0-9-]{3,100}$/;

/**
 * LinkedIn is link-only (no automated reading). Accepts a public profile link
 * such as https://www.linkedin.com/in/asha-kumar or the bare "asha-kumar" slug,
 * and returns the slug plus the canonical profile link.
 */
export function normalizeLinkedinProfile(input: string): { handle: string; profileUrl: string } | null {
  const value = input.trim().replace(/^@/, "");
  if (!value) return null;
  let slug: string | undefined;
  if (!value.includes("/") && !value.includes(".")) slug = value;
  else {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    if (!platformProfileUrlIsValid("linkedin", withProtocol)) return null;
    const segments = new URL(withProtocol).pathname.split("/").filter(Boolean);
    if (segments[0]?.toLowerCase() !== "in") return null;
    slug = segments[1];
  }
  if (!slug || !linkedinSlugPattern.test(slug)) return null;
  return { handle: slug, profileUrl: `https://www.linkedin.com/in/${slug}` };
}
