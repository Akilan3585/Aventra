# Definition of Done

A change to AventraAI is done when every item below that applies to it is true. Items marked **(enforced)** fail CI on their own. The rest are checked in review.

Terms used here are defined in the [glossary](glossary.md).

## Code quality

- [ ] `pnpm lint` passes with **0 errors and 0 warnings** (the script runs `eslint . --max-warnings=0`). **(enforced)**
- [ ] `pnpm typecheck` passes. **(enforced)** Locally, large projects may need `NODE_OPTIONS=--max-old-space-size=8192`.
- [ ] `pnpm test` passes, including `tests/architecture.test.ts`. **(enforced)**
- [ ] `pnpm build` succeeds. **(enforced)**
- [ ] `pnpm check` (all four of the above) was run locally before opening the PR.
- [ ] CI is green: the *Quality and production build* job, plus *Validate Lambda container* on pull requests.
- [ ] No `eslint-disable` comments without a reason on the same line.

### Lint rules beyond the Next.js presets

| Rule | Why |
|---|---|
| `@typescript-eslint/consistent-type-imports` | Type-only imports are erased, so client components can reference repository types without bundling server code. Autofixable. |
| `@typescript-eslint/no-explicit-any` | Use `unknown` and narrow it, or use the generated `Database` types. |
| `eqeqeq` (smart) | `===` everywhere. `== null` is allowed as a null-or-undefined check. |
| `no-console` (warn, allows `warn`/`error`) | Remove debug logging. Warnings still fail the zero-warning gate. |

## Architecture

Import boundaries are enforced by `@typescript-eslint/no-restricted-imports` in `eslint.config.mjs`. Every error message links back to this section.

- [ ] **Design system is feature-agnostic.** `src/design-system/**` never imports `@/features`, `@/ai`, `@/server`, or `@/app`. **(enforced)**
- [ ] **Domain is pure.** `src/features/*/domain/**` never imports `@/server`, `@/ai`, `@/app`, `next`, `react`, `server-only`, `@supabase/*`, or any `application`/`infrastructure`/`presentation` layer. Domain rules must be runnable in plain vitest. **(enforced)**
- [ ] **Features talk through domain or presentation.** A feature may import another feature's `domain/` or `presentation/`, never its `application/` or `infrastructure/`. Shared rules belong in a domain module (for example `campusPolicies` in `operations/domain/operations-rules.ts`). **(enforced)**
- [ ] **UI does not load data.** `features/*/presentation/**` and `src/components/**` never make value imports of `*.repository`, `@/server/supabase/*`, or `@supabase/supabase-js`. `import type` is fine. Pages or Server Actions load and pass the data. **(enforced)**
- [ ] **Only repositories create the admin client.** `createSupabaseAdminClient` is not imported in `src/app/**` (except `src/app/api/**`) or `src/ai/**` (except `*.repository.ts`). `isSupabaseAdminConfigured` may be imported anywhere. **(enforced)** *Known exceptions (TODO): `src/ai/application/agent-actions.ts` and `src/ai/orchestration/campus-agent.ts`. Their writes should move into `src/ai/observability/agent-run.repository.ts`.*
- [ ] **Repositories are server-only.** Every `*.repository.ts` starts with `import "server-only";`. **(enforced, architecture test)**
- [ ] **Feature folders use only real layers.** Subfolders of `src/features/<name>/` are `application | domain | infrastructure | presentation` and are never empty. **(enforced, architecture test)**
- [ ] **Next.js 16 conventions.** Request interception lives in `src/proxy.ts`, and there is no `middleware.ts`. **(enforced, architecture test)** Read `node_modules/next/dist/docs/` before using a Next API you have not used in this repo.

Relative imports between features (`../../attendance/domain/...`) are allowed inside domain code, because vitest has no `@/` alias configured.

## Server Actions

Files: `features/<name>/application/*-actions.ts`.

- [ ] Starts with `"use server";`. **(enforced, architecture test)**
- [ ] Calls `requirePermission(permission)` before anything else. **(enforced, architecture test)** Exempt: `student-onboarding-actions.ts`, which runs before a campus profile exists and authenticates with Clerk `auth()`.
- [ ] Validates `FormData` with a zod `safeParse`, and maps failures to a user message.
- [ ] Writes through the admin client inside a repository or the action. Never from UI.
- [ ] Inserts an `audit_logs` row for every mutation.
- [ ] Calls `revalidatePath` for every affected route.
- [ ] Returns `{ message, status: "idle" | "error" | "success" }` for `useActionState`, and maps `AUTHENTICATION_REQUIRED` / `CAMPUS_MEMBERSHIP_INACTIVE` / `PERMISSION_DENIED` / `CLERK_PERMISSION_DENIED` to friendly messages.
- [ ] Faculty writes are checked against academic scope on the server.

## Platform pages

Files: `src/app/(platform)/**/page.tsx`.

- [ ] `export const dynamic = "force-dynamic"`. **(enforced, architecture test)**
- [ ] Renders `mode="configuration"` when Clerk or Supabase is unconfigured.
- [ ] `getCampusAccess()` then `hasPermission(...)` → `mode="forbidden"`.
- [ ] Repository load wrapped in try/catch → `mode="error"`.
- [ ] Otherwise `mode="live"`, with `canManage` derived from the manage permission.
- [ ] New routes are added to `src/config/navigation.ts` for the roles that can see them.

## Data and schema

- [ ] Schema changes are a new file in `supabase/migrations/`, named in order. Never edit an applied migration.
- [ ] RLS is enabled on every new table. No grants to `anon` or `authenticated`.
- [ ] `src/types/database.ts` has been regenerated from the Supabase project after the migration was applied.
- [ ] Queries live in `infrastructure/*.repository.ts`, never in pages, components, or agents.

## Authorization

- [ ] New permissions are added to `permissions` and the `rolePermissions` matrix in `src/server/auth/permissions.ts` first.
- [ ] `tests/permissions.test.ts` is updated to cover the new permissions.
- [ ] `pnpm test:security` passes.
- [ ] Students only see their own records. Faculty only see their assigned course offerings.

## Tests

- [ ] New or changed business rules in `domain/` have colocated `*.test.ts` vitest tests.
- [ ] Policy, config, and routing changes are covered in `tests/*.test.ts`.
- [ ] Bug fixes include a test that fails without the fix, where practical.

## AI agents

- [ ] `buildDeterministicDecision` stays authoritative: the LLM may only rewrite `summary`, `reasons`, and `nextActions`, and may only **lower** `confidence`.
- [ ] The agent still completes with no provider configured (`deterministic-fallback`).
- [ ] Agent tools call feature repositories, never the database.
- [ ] Runs, decisions, messages, and an `agent.completed` audit row are persisted.
- [ ] Decisions that need review go through `approveAgentDecisionAction` (`agents:review`).

## Configuration and operations

- [ ] New environment variables are added to `.env.example` with a `REPLACE_ME` value.
- [ ] Code treats `REPLACE_ME` / `your-project-ref` / `your-campus.edu` as *unconfigured* and degrades gracefully. It never crashes.
- [ ] Secrets are never `NEXT_PUBLIC_*`.
- [ ] Integrations that can fail (Resend, Google Sheets) report failure truthfully. Supabase stays the system of record.

## Documentation

- [ ] `CLAUDE.md`, `README.md`, or an ADR in `docs/adr/` is updated when behavior, commands, or architecture change.
- [ ] New project terms are added to the [glossary](glossary.md).
