import { describe, expect, it } from "vitest";

import {
  buildGithubMetrics,
  isAutoSyncPlatform,
  normalizeLinkedinProfile,
  normalizePlatformHandle,
  parseCodechefProfile,
  parseGithubContributions,
  parseHackerrankBadges,
  parseLeetcodeProfile,
  platformProfileUrl,
} from "./platform-metrics-parsers";

describe("platform handles", () => {
  it("accepts bare usernames and strips a leading @", () => {
    expect(normalizePlatformHandle("github", "akilan-b")).toBe("akilan-b");
    expect(normalizePlatformHandle("leetcode", "@neal_wu")).toBe("neal_wu");
  });

  it("extracts the username from each platform's profile link", () => {
    expect(normalizePlatformHandle("github", "https://github.com/torvalds")).toBe("torvalds");
    expect(normalizePlatformHandle("leetcode", "https://leetcode.com/u/neal_wu/")).toBe("neal_wu");
    expect(normalizePlatformHandle("leetcode", "leetcode.com/neal_wu")).toBe("neal_wu");
    expect(normalizePlatformHandle("codechef", "https://www.codechef.com/users/gennady.korotkevich")).toBe("gennady.korotkevich");
    expect(normalizePlatformHandle("hackerrank", "https://www.hackerrank.com/profile/thelegend")).toBe("thelegend");
  });

  it("rejects links to other sites and unsafe handles", () => {
    expect(normalizePlatformHandle("github", "https://evil.example/torvalds")).toBeNull();
    expect(normalizePlatformHandle("github", "a b")).toBeNull();
    expect(normalizePlatformHandle("github", "../admin")).toBeNull();
    expect(normalizePlatformHandle("github", "")).toBeNull();
  });

  it("builds canonical profile links and knows LinkedIn is manual", () => {
    expect(platformProfileUrl("codechef", "abc")).toBe("https://www.codechef.com/users/abc");
    expect(platformProfileUrl("leetcode", "abc")).toBe("https://leetcode.com/u/abc/");
    expect(isAutoSyncPlatform("github")).toBe(true);
    expect(isAutoSyncPlatform("linkedin")).toBe(false);
  });
});

describe("platform metric parsers", () => {
  it("reads GitHub yearly contributions and repositories", () => {
    expect(parseGithubContributions("<h2>\n  3,815 contributions\n  in the last year\n</h2>")).toBe(3815);
    expect(parseGithubContributions("<h2>1 contribution in the last year</h2>")).toBe(1);
    expect(parseGithubContributions("<p>nothing</p>")).toBeNull();
    expect(buildGithubMetrics({ public_repos: 12 }, 3815)).toEqual({ activityCount: 12, score: 3815, tier: null });
    expect(buildGithubMetrics({}, null)).toEqual({ activityCount: null, score: 0, tier: null });
  });

  it("reads LeetCode solved count, contest rating, and percentile", () => {
    const payload = { data: {
      matchedUser: { profile: { ranking: 639130 }, submitStatsGlobal: { acSubmissionNum: [{ count: 253, difficulty: "All" }, { count: 60, difficulty: "Easy" }] } },
      userContestRanking: { attendedContestsCount: 51, rating: 3686.191, topPercentage: 0.01 },
    } };
    expect(parseLeetcodeProfile(payload)).toEqual({ activityCount: 253, score: 3686, tier: "Top 0.01%" });
    expect(parseLeetcodeProfile({ data: { matchedUser: { profile: { ranking: 5 }, submitStatsGlobal: null }, userContestRanking: null } }))
      .toEqual({ activityCount: null, score: 0, tier: "Rank 5" });
    expect(parseLeetcodeProfile({ data: { matchedUser: null }, errors: [{ message: "That user does not exist." }] })).toBeNull();
  });

  it("reads CodeChef rating, stars, and problems solved", () => {
    const html = `<div class="rating-star">\n<span>&#9733;</span><span>&#9733;</span><span>&#9733;</span></div>
      <div class="rating-number">3355</div><h3>Total Problems Solved: 632</h3>`;
    expect(parseCodechefProfile(html)).toEqual({ activityCount: 632, score: 3355, tier: "3★" });
    expect(parseCodechefProfile("<h3>Total Problems Solved: 4</h3>")).toEqual({ activityCount: 4, score: 0, tier: null });
    expect(parseCodechefProfile("<html>home page</html>")).toBeNull();
  });

  it("sums HackerRank badge points and picks the best badge", () => {
    const payload = { models: [
      { badge_name: "Problem Solving", stars: 6, total_points: 475 },
      { badge_name: "Python", stars: 2, total_points: 120 },
    ] };
    expect(parseHackerrankBadges(payload)).toEqual({ activityCount: 2, score: 595, tier: "Problem Solving 6★" });
    expect(parseHackerrankBadges({ models: [] })).toEqual({ activityCount: 0, score: 0, tier: null });
  });
});

describe("linkedin profiles", () => {
  it("accepts a public profile link or slug and returns the canonical link", () => {
    expect(normalizeLinkedinProfile("https://www.linkedin.com/in/akilan-b-123/")).toEqual({ handle: "akilan-b-123", profileUrl: "https://www.linkedin.com/in/akilan-b-123" });
    expect(normalizeLinkedinProfile("linkedin.com/in/asha-kumar")).toEqual({ handle: "asha-kumar", profileUrl: "https://www.linkedin.com/in/asha-kumar" });
    expect(normalizeLinkedinProfile("asha-kumar")).toEqual({ handle: "asha-kumar", profileUrl: "https://www.linkedin.com/in/asha-kumar" });
  });

  it("rejects company pages, other sites, and bad slugs", () => {
    expect(normalizeLinkedinProfile("https://www.linkedin.com/company/acme")).toBeNull();
    expect(normalizeLinkedinProfile("https://evil.example/in/asha")).toBeNull();
    expect(normalizeLinkedinProfile("a b")).toBeNull();
    expect(normalizeLinkedinProfile("")).toBeNull();
  });
});
