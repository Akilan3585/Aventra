import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Rules from docs/engineering/definition-of-done.md that ESLint cannot express.
// Import boundaries live in eslint.config.mjs.

const root = join(__dirname, "..");
const src = join(root, "src");

const sourceFiles = readdirSync(src, { recursive: true, encoding: "utf8" })
  .map((file) => file.split(sep).join("/"))
  .filter((file) => /\.(ts|tsx)$/.test(file));

const read = (file: string) => readFileSync(join(src, file), "utf8");

// Actions that run before a campus profile exists authenticate with Clerk directly.
const actionsWithoutPermissionGate = new Set([
  "features/students/application/student-onboarding-actions.ts",
]);

describe("architecture rules", () => {
  it("marks every repository server-only", () => {
    const repositories = sourceFiles.filter((file) => file.endsWith(".repository.ts"));

    expect(repositories.length).toBeGreaterThan(0);
    for (const file of repositories) {
      expect(read(file), file).toMatch(/^import "server-only";/m);
    }
  });

  it("gates every Server Action file with requirePermission", () => {
    const actions = sourceFiles.filter((file) => /\/application\/[^/]+-actions\.ts$/.test(file));

    expect(actions.length).toBeGreaterThan(0);
    for (const file of actions) {
      const contents = read(file);

      expect(contents, file).toMatch(/^"use server";/m);
      if (!actionsWithoutPermissionGate.has(file)) {
        expect(contents, file).toContain("requirePermission(");
      }
    }
  });

  it("renders every platform page dynamically", () => {
    const pages = sourceFiles.filter(
      (file) => file.startsWith("app/(platform)/") && file.endsWith("/page.tsx"),
    );

    expect(pages.length).toBeGreaterThan(0);
    for (const file of pages) {
      expect(read(file), file).toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("only uses the four feature layers and never leaves them empty", () => {
    const layers = new Set(["application", "domain", "infrastructure", "presentation"]);

    for (const feature of readdirSync(join(src, "features"), { withFileTypes: true })) {
      if (!feature.isDirectory()) continue;

      for (const entry of readdirSync(join(src, "features", feature.name), { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const path = relative(root, join(src, "features", feature.name, entry.name));

        expect(layers.has(entry.name), `${path} is not a feature layer`).toBe(true);
        expect(readdirSync(join(root, path)).length, `${path} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it("uses proxy.ts instead of middleware.ts", () => {
    expect(existsSync(join(src, "proxy.ts"))).toBe(true);
    expect(existsSync(join(src, "middleware.ts"))).toBe(false);
    expect(existsSync(join(root, "middleware.ts"))).toBe(false);
  });
});
