# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is pnpm 11.9 (pinned in `packageManager`); Node >= 20.9 (CI and Docker use 22).

```bash
pnpm install
pnpm dev                      # Next.js dev server on http://localhost:3000
pnpm build                    # production build (standalone output unless VERCEL is set)
pnpm lint                     # eslint . --max-warnings=0 (warnings fail)
pnpm typecheck                # tsc --noEmit
pnpm test                     # vitest run (all tests)
pnpm check                    # lint + typecheck + test + build; run before a PR
```

Single test file or test name (there is no vitest config; defaults apply):

```bash
pnpm vitest run tests/permissions.test.ts
pnpm vitest run src/features/attendance/domain/attendance-rules.test.ts
pnpm vitest run -t "counts present and late"
```

Tests live in `tests/*.test.ts` (policy/config/routing tests) and colocated `src/**/*.test.ts` (pure domain rules and `src/server/auth/permissions.test.ts`). `tests/{agents,contract,e2e}` and `supabase/tests` are placeholders with READMEs only.

Local env: copy `.env.example` to `.env.local`. Values containing `REPLACE_ME` (or `your-project-ref`, `your-campus.edu`) are treated by the code as *unconfigured*, not as errors: `isClerkConfigured()`, `isSupabaseAdminConfigured()`, `resolveAiProviderConfiguration()`, and `sendAttendanceAlertEmail()` all check for the sentinel, and pages then render a `mode="configuration"` state (or the email returns `not-configured`) instead of crashing. This is why the app builds and boots with no credentials. `src/proxy.ts` also skips `clerkMiddleware()` entirely when Clerk is unconfigured.

Docker: `docker build --target development .` runs the dev server; the default final target `runtime` is the AWS Lambda image (Lambda Web Adapter + standalone server on port 8080).

## Architecture

Modular Next.js 16 App Router monolith (see `docs/adr/`). Strict dependency direction, enforced by the `no-restricted-imports` boundary rules in `eslint.config.mjs` plus `tests/architecture.test.ts`. The full checklist is `docs/engineering/definition-of-done.md`, and terms are in `docs/engineering/glossary.md`:

```
src/app (routes)  ->  src/features/* and src/ai (business logic)  ->  src/server/* (auth, Supabase, audit)  ->  Supabase PostgreSQL
```

- Pages, client components, and agents never touch the database directly. All queries live in `features/<name>/infrastructure/*.repository.ts` files marked `import "server-only"` and use `createSupabaseAdminClient()` (secret key). `createServerSupabaseClient()` (publishable key) exists but privileged flows use the admin client after app-level authorization.
- `src/design-system` (tokens, primitives, patterns) must not import from `features`. shadcn's `ui` alias points at `@/design-system/primitives` (see `components.json`).
- `src/proxy.ts` is the Next.js 16 replacement for `middleware.ts`. It wraps `clerkMiddleware()` and, in dev, redirects LAN-IP hosts to the `NEXT_PUBLIC_APP_URL` localhost origin so Clerk cookies work.
- `supabase/migrations/*.sql` is the only schema authority (no Prisma, no Supabase CLI config in the repo). Migrations are applied to the project manually in filename order; after a schema change, regenerate `src/types/database.ts` from the Supabase project because repositories rely on the generated `Database` type. RLS is enabled on every table and `anon`/`authenticated` have no grants, so only the secret-key admin client can read or write.
- Feature modules (`src/features/<name>/`) only create the `application | domain | infrastructure | presentation` subdirectories that have real code; do not add empty layer folders. Another feature may import a feature's `domain/` or `presentation/`, never its `application/` or `infrastructure/` (lint-enforced). `domain/` must stay pure (no `@/server`, `next`, `react`, or Supabase), and cross-feature domain imports use relative paths because vitest has no `@/` alias.
- Cross-feature numeric policy (attendance thresholds, utilization target) lives in one place: `campusPolicies` in `src/features/operations/domain/operations-rules.ts`.

### Authorization model (two layers, server-enforced)

Clerk answers *who*; the Supabase `profiles` row answers *what they may do*. Key files under `src/server/auth/`:

- `permissions.ts`: the `Role` and `Permission` unions and the `rolePermissions` matrix. Add new permissions here first; `tests/permissions.test.ts` guards the matrix.
- `campus-access.ts`: `getCampusIdentity()` (React `cache`d, one Clerk + one profiles lookup per request) resolves status: `active | pending | suspended | expired | unlinked | unverified-email | organization-* | role-mismatch`. `CAMPUS_ADMIN_EMAILS` is a bootstrap allowlist that grants `super-admin` even without a profile row. `requirePermission(permission)` is the gate for every Server Action; it throws string-coded errors (`AUTHENTICATION_REQUIRED`, `CAMPUS_MEMBERSHIP_INACTIVE`, `PERMISSION_DENIED`, `CLERK_PERMISSION_DENIED`) that actions map to user messages.
- `academic-scope.ts`: faculty are scoped to their assigned `course_offerings`; repositories accept an optional faculty profile id and filter through these helpers. Student pages scope to the signed-in student's own records.
- `clerk-authorization-sync.ts`: mirrors role/status into Clerk private metadata and optionally Clerk Organization membership. Clerk Organization checks only activate when `CLERK_CAMPUS_ORGANIZATION_ID` is set; `CLERK_ENFORCE_ORGANIZATION_PERMISSIONS=true` adds a second `auth().has()` check on top of Supabase.
- `src/server/workspace/workspace-access.ts`: `resolveWorkspaceAccess(read, manage?)` is used by `app/(platform)/layout.tsx` (defense in depth for every platform route) and by pages; it redirects to `/sign-in`, `/access-pending`, or `/access-denied` as appropriate.
- `/app` (`src/app/app/page.tsx`) is the post-login router: it validates the requested `?portal=` against the role's verified portal (`src/config/workspace-routes.ts`) and redirects to `homeForRole` from `src/config/navigation.ts`.
- `/api/webhooks/clerk` syncs `user.created`/`user.updated` into `profiles` and links `clerk_user_id`.

### Conventions for pages and Server Actions

Platform pages (`src/app/(platform)/*/page.tsx`) follow one shape: `export const dynamic = "force-dynamic"`; short-circuit to `mode="configuration"` when Clerk/Supabase are unconfigured; `getCampusAccess()` then `hasPermission` for `mode="forbidden"`; repository load wrapped in try/catch for `mode="error"`; otherwise `mode="live"` with `canManage` derived from the manage permission.

Server Actions (`features/<name>/application/*-actions.ts`, `"use server"`) follow: `requirePermission` first; validate `FormData` with a zod `safeParse`; perform the write via the admin client; insert an `audit_logs` row for mutations; `revalidatePath` the affected routes; return `{ message, status: "idle" | "error" | "success" }` for `useActionState`. Pure business rules go in `features/<name>/domain/` and get colocated vitest tests.

Attendance is marked per student per session (no class needed): `saveAttendanceSessionAction` (`features/attendance/application/attendance-session-actions.ts`) saves the listed students for `date + session` into `attendance_records` (unique on `student_id, session_date, session`; `enrollment_id` is nullable history), enforces faculty scope (students in assigned classes) and student existence server-side, refuses stale saves via the `version` (newest `updated_at`) the client loaded, audits each record (`attendance.created` / `attendance.updated` with old/new status), then calls `evaluateAttendanceEmailAlert(studentId)` (`attendance-alert.service.ts`) for changed students and mirrors the changed records to Google Sheets. The alert service upserts an `attendance_alerts` row (one open alert per student, overall attendance), creates a `notifications` row, and sends through Resend (`src/server/email/resend.ts`, plain `fetch`, idempotency key per alert); it resolves the alert when the rate climbs back above `campusPolicies.attendanceEmailAlertPercent`. Statuses and the percentage rule live in `features/attendance/domain/attendance-rules.ts` (present/late/OD attended; permission/leave/excused excluded).

Google Sheets mirror (`src/server/google/sheets.ts`, service-account JWT signed with Node crypto, plain `fetch`): `attendance-sheet-sync.service.ts` writes normalized `Attendance`, `Students`, and `Attendance_Audit` tabs, matching rows on column A (Supabase ids) so re-runs never duplicate, and records every run in `attendance_sheet_syncs`. Supabase stays the system of record; a failed mirror is reported as such, never as a false success. `GOOGLE_*` values containing `REPLACE_ME`/`your-project` mean not configured. `/api/cron/attendance-sheet-sync` (bearer `CRON_SECRET`, scheduled in `vercel.json`) runs a full mirror.

API routes are minimal: `/api/health` (unauthenticated JSON), `/api/reports/[report]` (CSV export gated by `requirePermission("reports:read")`, reports `students | attendance`), `/api/cron/attendance-sheet-sync` and `/api/cron/platform-metrics-sync` (both bearer `CRON_SECRET` via `src/server/auth/cron-auth.ts`), and `/api/webhooks/clerk`. Platform metrics (GitHub, LeetCode, CodeChef, HackerRank) are fetched from public profiles by `features/performance/infrastructure/platform-metrics.client.ts`; LinkedIn stays manual.

### AI agents (`src/ai/`)

`orchestration/campus-agent.ts` runs three agents (`coordinator`, `student-success`, `classroom`). The flow is intentionally "deterministic first":

1. `buildDeterministicDecision` computes the binding `action` (`monitor | review`), `requiresHumanReview`, and evidence from repository loads. This result is authoritative.
2. If a provider resolves, a Vercel AI SDK `ToolLoopAgent` is run with `prepareStep` forcing each tool in `activeToolsByAgent[agent]` in order; the LLM may only rewrite `summary`, `reasons`, `nextActions`, and lower (never raise) `confidence`.
3. Any provider error, or a required tool not being called, falls back to the deterministic result with `execution.mode = "deterministic-fallback"`.
4. Runs, decisions, coordinator messages, and an `agent.completed` audit row are persisted to `agent_runs`, `agent_decisions`, `agent_messages`, `audit_logs`. Decisions needing review are approved by humans via `approveAgentDecisionAction` (`agents:review`).

Provider selection (`providers/provider-configuration.ts`): `AI_PROVIDER` picks the preferred provider (`openai` default, `gemini`); if its key/model are unusable the other fully configured provider is tried; if neither, the agent runs deterministic-only. Tools (`tools/campus-tools.ts`) call feature repositories, never the database.

### Deployment targets

- Vercel: auto-detected Next.js; `next.config.ts` drops `output: "standalone"` when `VERCEL` is set.
- AWS Lambda: `.github/workflows/ci.yml` (lint, typecheck, test, build, plus a Docker build on PRs) then `deploy-aws-lambda.yml` (ARM64 image to ECR via OIDC, Lambda version publish, alias promotion, health smoke test, auto rollback). Details in `docs/operations/github-actions-aws.md` and `docs/architecture/aws-lambda-production.md`. `NEXT_PUBLIC_*` values are build args baked into the image; secrets are Lambda runtime env vars.
