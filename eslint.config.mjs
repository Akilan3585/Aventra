import { readdirSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architecture boundaries from docs/engineering/definition-of-done.md.
// Flat config replaces (not merges) a rule's options when several blocks match
// one file, so each feature layer gets a single block with every group it needs.

const dod = "See docs/engineering/definition-of-done.md#architecture.";

const features = readdirSync(new URL("./src/features", import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const layers = ["application", "domain", "infrastructure", "presentation"];

const crossFeatureGroup = (feature) => ({
  group: [
    "@/features/*/application/**",
    "@/features/*/infrastructure/**",
    `!@/features/${feature}/application/**`,
    `!@/features/${feature}/infrastructure/**`,
    "../../*/application/**",
    "../../*/infrastructure/**",
  ],
  message: `Features may only use another feature's domain/ or presentation/. Move shared logic into a domain module. ${dod}`,
});

const pureDomainGroup = {
  group: [
    "@/server/**",
    "@/ai/**",
    "@/app/**",
    "next",
    "next/**",
    "react",
    "react-dom",
    "server-only",
    "@supabase/*",
    "**/application/**",
    "**/infrastructure/**",
    "**/presentation/**",
  ],
  message: `domain/ holds pure business rules: no framework, server, or data-access imports. ${dod}`,
};

const clientDataGroup = {
  group: ["**/*.repository", "@/server/supabase/**", "@supabase/supabase-js"],
  allowTypeImports: true,
  message: `UI code must not load repositories or Supabase clients (type-only imports are fine). Fetch data in the page or a Server Action. ${dod}`,
};

const adminClientPath = {
  name: "@/server/supabase/admin-client",
  importNames: ["createSupabaseAdminClient"],
  message: `Only repositories (and API routes) create the admin client. Add a repository function instead. ${dod}`,
};

const restrict = (options) => ({
  "@typescript-eslint/no-restricted-imports": ["error", options],
});

const featureLayerBlocks = features.flatMap((feature) =>
  layers.map((layer) => ({
    files: [`src/features/${feature}/${layer}/**/*.{ts,tsx}`],
    rules: restrict({
      patterns: [
        crossFeatureGroup(feature),
        ...(layer === "domain" ? [pureDomainGroup] : []),
        ...(layer === "presentation" ? [clientDataGroup] : []),
      ],
    }),
  })),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      eqeqeq: ["error", "smart"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["src/design-system/**/*.{ts,tsx}"],
    rules: restrict({
      patterns: [
        {
          group: ["@/features/**", "@/ai/**", "@/server/**", "@/app/**"],
          message: `The design system is feature-agnostic and must not import app, feature, AI, or server code. ${dod}`,
        },
      ],
    }),
  },
  ...featureLayerBlocks,
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: restrict({ patterns: [clientDataGroup] }),
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/ai/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**", "src/**/*.repository.ts"],
    rules: restrict({ paths: [adminClientPath] }),
  },
  {
    // TODO(dod): move these writes into src/ai/observability/agent-run.repository.ts.
    files: [
      "src/ai/application/agent-actions.ts",
      "src/ai/orchestration/campus-agent.ts",
    ],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
