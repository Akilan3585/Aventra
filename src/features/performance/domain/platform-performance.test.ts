import { describe, expect, it } from "vitest";

import {
  codingPlatforms,
  platformCatalog,
  platformProfileUrlIsValid,
  platformReadiness,
  readinessBand,
  summarizePlatformCoverage,
  summarizeStudentPlatforms,
} from "./platform-performance";

describe("platform readiness", () => {
  it("normalizes each platform's headline score onto 0–100 and clamps the ends", () => {
    expect(platformReadiness("codechef", 1000)).toBe(0);
    expect(platformReadiness("codechef", 1750)).toBe(50);
    expect(platformReadiness("codechef", 3000)).toBe(100);
    expect(platformReadiness("linkedin", 250)).toBe(50);
    expect(platformReadiness("hackerrank", -20)).toBe(0);
    expect(platformReadiness("leetcode", Number.NaN)).toBe(0);
  });

  it("maps readiness to stable bands", () => {
    expect(readinessBand(0)).toBe("starter");
    expect(readinessBand(20)).toBe("emerging");
    expect(readinessBand(45)).toBe("developing");
    expect(readinessBand(60)).toBe("advanced");
    expect(readinessBand(95)).toBe("expert");
  });

  it("keeps a catalog entry for every platform", () => {
    for (const platform of codingPlatforms) {
      const definition = platformCatalog[platform];
      expect(definition.label).toBeTruthy();
      expect(definition.scoreScale.ceiling).toBeGreaterThan(definition.scoreScale.floor);
    }
  });
});

describe("platform profile links", () => {
  it("accepts only http(s) links on the platform's own domain", () => {
    expect(platformProfileUrlIsValid("linkedin", "https://www.linkedin.com/in/asha-kumar")).toBe(true);
    expect(platformProfileUrlIsValid("codechef", "https://www.codechef.com/users/asha")).toBe(true);
    expect(platformProfileUrlIsValid("hackerrank", "https://www.codechef.com/users/asha")).toBe(false);
    expect(platformProfileUrlIsValid("github", "ftp://github.com/asha")).toBe(false);
    expect(platformProfileUrlIsValid("leetcode", "not a url")).toBe(false);
  });
});

describe("platform summaries", () => {
  it("averages a student's readiness and reports the strongest platform", () => {
    const summary = summarizeStudentPlatforms([
      { platform: "codechef", score: 1750 },
      { platform: "linkedin", score: 500 },
      { platform: "hackerrank", score: 0 },
    ]);
    expect(summary.linkedPlatforms).toBe(3);
    expect(summary.compositeReadiness).toBe(50);
    expect(summary.strongest).toEqual({ platform: "linkedin", readiness: 100 });
  });

  it("returns an empty summary when nothing is linked", () => {
    expect(summarizeStudentPlatforms([])).toEqual({ compositeReadiness: null, linkedPlatforms: 0, strongest: null });
  });

  it("summarizes campus coverage per platform in catalog order", () => {
    const coverage = summarizePlatformCoverage([
      { platform: "codechef", score: 1750, studentId: "s1" },
      { platform: "codechef", score: 2500, studentId: "s2" },
      { platform: "github", score: 500, studentId: "s1" },
    ]);
    expect(coverage.map((item) => item.platform)).toEqual([...codingPlatforms]);
    expect(coverage.find((item) => item.platform === "codechef")).toEqual({ averageReadiness: 75, averageScore: 2125, linkedStudents: 2, platform: "codechef" });
    expect(coverage.find((item) => item.platform === "linkedin")).toEqual({ averageReadiness: null, averageScore: null, linkedStudents: 0, platform: "linkedin" });
  });
});
