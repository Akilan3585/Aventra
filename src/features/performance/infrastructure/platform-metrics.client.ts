import "server-only";

import {
  buildGithubMetrics,
  parseCodechefProfile,
  parseGithubContributions,
  parseHackerrankBadges,
  parseLeetcodeProfile,
  type AutoSyncPlatform,
  type FetchedPlatformMetrics,
} from "@/features/performance/domain/platform-metrics-parsers";

/**
 * Reads public profile data from GitHub, LeetCode, CodeChef, and HackerRank.
 * Server-only: runs inside Server Actions and the cron route, never the browser.
 * Handles are validated by normalizePlatformHandle before they reach here.
 */

const userAgent = "Mozilla/5.0 (compatible; AventraAI/1.0; +campus platform metrics)";
const timeoutMs = 12_000;

export class PlatformFetchError extends Error {
  constructor(message: string, readonly reason: "not-found" | "unavailable") {
    super(message);
    this.name = "PlatformFetchError";
  }
}

async function request(url: string, init: RequestInit = {}) {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { "User-Agent": userAgent, ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new PlatformFetchError("The platform did not respond in time. Try again shortly.", "unavailable");
  }
}

function assertAvailable(response: Response, label: string) {
  if (response.status === 429 || response.status === 403) {
    throw new PlatformFetchError(`${label} is rate limiting requests. Try again later.`, "unavailable");
  }
  if (!response.ok) throw new PlatformFetchError(`${label} returned HTTP ${response.status}.`, "unavailable");
}

async function fetchGithub(handle: string): Promise<FetchedPlatformMetrics> {
  const token = process.env.GITHUB_TOKEN;
  const auth: Record<string, string> = token && !token.includes("REPLACE_ME") ? { Authorization: `Bearer ${token}` } : {};
  const userResponse = await request(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
    headers: { Accept: "application/vnd.github+json", ...auth },
  });
  if (userResponse.status === 404) throw new PlatformFetchError(`No GitHub user named "${handle}".`, "not-found");
  assertAvailable(userResponse, "GitHub");
  const user = await userResponse.json() as { public_repos?: unknown };

  const calendar = await request(`https://github.com/users/${encodeURIComponent(handle)}/contributions`);
  assertAvailable(calendar, "GitHub");
  return buildGithubMetrics(user, parseGithubContributions(await calendar.text()));
}

async function fetchLeetcode(handle: string): Promise<FetchedPlatformMetrics> {
  const response = await request("https://leetcode.com/graphql", {
    body: JSON.stringify({
      query: "query($u:String!){matchedUser(username:$u){profile{ranking} submitStatsGlobal{acSubmissionNum{difficulty count}}} userContestRanking(username:$u){rating topPercentage}}",
      variables: { u: handle },
    }),
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
    method: "POST",
  });
  assertAvailable(response, "LeetCode");
  const metrics = parseLeetcodeProfile(await response.json().catch(() => null));
  if (!metrics) throw new PlatformFetchError(`No LeetCode user named "${handle}".`, "not-found");
  return metrics;
}

async function fetchCodechef(handle: string): Promise<FetchedPlatformMetrics> {
  const response = await request(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, { redirect: "manual" });
  // CodeChef redirects unknown users to its home page.
  if (response.status >= 300 && response.status < 400) throw new PlatformFetchError(`No CodeChef user named "${handle}".`, "not-found");
  assertAvailable(response, "CodeChef");
  const metrics = parseCodechefProfile(await response.text());
  if (!metrics) throw new PlatformFetchError("The CodeChef profile page could not be read; its layout may have changed.", "unavailable");
  return metrics;
}

async function fetchHackerrank(handle: string): Promise<FetchedPlatformMetrics> {
  const headers = { Accept: "application/json" };
  const profile = await request(`https://www.hackerrank.com/rest/contests/master/hackers/${encodeURIComponent(handle)}/profile`, { headers });
  if (profile.status === 404) throw new PlatformFetchError(`No HackerRank user named "${handle}".`, "not-found");
  assertAvailable(profile, "HackerRank");
  const body = await profile.json().catch(() => null) as { model?: { username?: string } } | null;
  if (!body?.model?.username) throw new PlatformFetchError(`No HackerRank user named "${handle}".`, "not-found");

  const badges = await request(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(handle)}/badges`, { headers });
  assertAvailable(badges, "HackerRank");
  return parseHackerrankBadges(await badges.json().catch(() => null));
}

export async function fetchPlatformMetrics(platform: AutoSyncPlatform, handle: string): Promise<FetchedPlatformMetrics> {
  switch (platform) {
    case "github": return fetchGithub(handle);
    case "leetcode": return fetchLeetcode(handle);
    case "codechef": return fetchCodechef(handle);
    case "hackerrank": return fetchHackerrank(handle);
  }
}
