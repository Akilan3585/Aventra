# Glossary

Key terms used in AventraAI's code, docs, and reviews. See also the [Definition of Done](definition-of-done.md).

## Quality gates

| Term | Meaning |
|---|---|
| **Lint** | `pnpm lint` runs ESLint (`eslint.config.mjs`) with the Next.js core-web-vitals and TypeScript presets, the project quality rules, and the architecture boundary rules. `--max-warnings=0` means any warning fails. |
| **Typecheck** | `pnpm typecheck` runs `tsc --noEmit` in strict mode. |
| **Test** | `pnpm test` runs vitest across `tests/*.test.ts` and colocated `src/**/*.test.ts`. |
| **Security tests** | `pnpm test:security` is the subset covering permissions, routing, auth, student approval/onboarding, and architecture rules. |
| **Build** | `pnpm build` is a production Next.js build (standalone output unless `VERCEL` is set). |
| **Check** | `pnpm check` runs lint, typecheck, test, and build in order. It is required before a PR. |
| **CI quality job** | *Quality and production build* in `.github/workflows/ci.yml`. It runs the four gates on every PR and every push to `main`. |
| **Container job** | *Validate Lambda container*. It builds the `runtime` Docker target on PRs. |
| **Boundary rule** | A `no-restricted-imports` rule that encodes an allowed dependency direction between folders. |
| **Architecture test** | `tests/architecture.test.ts`. File-system checks for rules ESLint can't express (server-only repositories, permission-gated actions, dynamic pages, feature layers, no `middleware.ts`). |
| **Zero-warning gate** | The policy that warnings are treated as failures, so they never pile up. |

## Architecture

| Term | Meaning |
|---|---|
| **Modular monolith** | One Next.js 16 App Router app split into feature modules with one-way dependencies: `app → features / ai → server → Supabase`. See ADR 0001. |
| **Feature module** | `src/features/<name>/`, which owns one business area (attendance, academics, students…). |
| **Layers** | A feature has up to four subfolders, created only when they hold code. **application**: Server Actions and services. **domain**: pure rules, no I/O. **infrastructure**: repositories. **presentation**: React UI. |
| **Repository** | `infrastructure/*.repository.ts`. The only place that queries the database. It is marked `server-only`. |
| **Admin client** | `createSupabaseAdminClient()` uses the secret key and bypasses RLS. It is used after app-level authorization. |
| **Server client** | `createServerSupabaseClient()` uses the publishable key. It exists, but privileged flows don't use it. |
| **`server-only`** | Import marker that makes the build fail if the module ends up in a client bundle. |
| **`proxy.ts`** | Next.js 16's replacement for `middleware.ts`. It wraps `clerkMiddleware()` and redirects LAN-IP hosts to localhost in dev. |
| **Migration** | A SQL file in `supabase/migrations/`, applied by hand in filename order. It is the only schema authority. |
| **RLS** | Row Level Security. It is enabled on every table, with no grants for `anon`/`authenticated`, so only the admin client can read or write. |
| **`Database` type** | `src/types/database.ts`, generated from the Supabase project. Repositories depend on it. |
| **Design system** | `src/design-system`: tokens, primitives (shadcn `ui` alias), and patterns. It must not import features. |
| **`campusPolicies`** | Single source of numeric policy in `features/operations/domain/operations-rules.ts`: pass mark 40%, attendance email alert 70%, attendance warning 75%, room utilization target 80%, schedule conflict buffer 0 min. |
| **Configuration mode** | What a page renders (`mode="configuration"`) when a service's env values still contain `REPLACE_ME`. The app builds and boots with no credentials. |
| **Page modes** | `configuration`, `forbidden`, `error`, `live`: the four states every platform page renders. |

## Auth and roles

| Term | Meaning |
|---|---|
| **Clerk vs profile** | Clerk answers *who* the user is. The Supabase `profiles` row answers *what they may do*. |
| **Role** | `super-admin`, `admin`, `faculty`, or `student`. |
| **Permission** | A `resource:action` string, such as `students:approve`, `attendance:record`, `reports:read`, or `agents:review`. The full list is in `src/server/auth/permissions.ts`. |
| **`rolePermissions`** | The role → permissions matrix. Guarded by `tests/permissions.test.ts`. |
| **Campus identity** | The result of `getCampusIdentity()`: one Clerk lookup and one profile lookup, cached per request. |
| **Identity status** | `active`, `pending`, `suspended`, `expired`, `unlinked` (no profile), `unverified-email`, `organization-required`, `organization-mismatch`, or `role-mismatch`. Only `active` gets into the workspace. |
| **`requirePermission`** | The gate at the top of every Server Action. It throws `AUTHENTICATION_REQUIRED`, `CAMPUS_MEMBERSHIP_INACTIVE`, `PERMISSION_DENIED`, or `CLERK_PERMISSION_DENIED`. |
| **`CAMPUS_ADMIN_EMAILS`** | A bootstrap allowlist that grants `super-admin` even with no profile row. |
| **Academic scope** | Faculty only see and change records for their assigned `course_offerings`. Students only see their own records. |
| **Portal** | The student or faculty entry point (`/student/sign-in`, `/faculty/sign-in`). `/app` checks the requested portal against the role, then redirects to `homeForRole`. |
| **Workspace access** | `resolveWorkspaceAccess()` redirects to `/sign-in`, `/access-pending`, or `/access-denied`. It is called in the platform layout and in pages. |
| **Clerk organization sync** | Mirrors role and status into Clerk metadata and, optionally, organization membership. The org check is enforced only when `CLERK_ENFORCE_ORGANIZATION_PERMISSIONS=true`. |
| **Student approval** | Students who sign up start out `pending` until faculty approve them. |

## Domain and AI

| Term | Meaning |
|---|---|
| **Attendance session** | Attendance marked per student per `date + session`, with no class required. Unique on `(student_id, session_date, session)`. |
| **Attendance statuses** | `present`, `late`, and `od` count as **attended**. `absent` counts but is not attended. `permission`, `leave`, and `excused` are **excluded** from the rate. |
| **Attendance rate** | Attended ÷ counted sessions (`calculateAttendanceRate`). |
| **Stale-save version** | The newest `updated_at` the client loaded. A save is refused if the records changed since. |
| **Attendance alert** | One open `attendance_alerts` row per student while the rate is below 70%. It sends a `notifications` row and a Resend email, and resolves when the rate recovers. |
| **Sheets mirror** | A one-way copy of attendance, students, and audit data to Google Sheets, keyed by Supabase ids so it never duplicates rows. Logged in `attendance_sheet_syncs`. Supabase remains the system of record. |
| **Audit log** | An `audit_logs` row written for every mutation, e.g. `attendance.updated` with old and new status, or `agent.completed`. |
| **Agents** | `coordinator`, `student-success`, and `classroom`, orchestrated in `src/ai/orchestration/campus-agent.ts`. |
| **Deterministic decision** | `buildDeterministicDecision` computes the binding `action` (`monitor` or `review`), `requiresHumanReview`, and evidence from repository data. It is authoritative. |
| **LLM refinement** | An optional `ToolLoopAgent` pass that may rewrite the summary, reasons, and next actions, and may only lower confidence. |
| **Deterministic fallback** | `execution.mode = "deterministic-fallback"`. Used when there is no provider, when the provider errors, or when a required tool was not called. |
| **Provider resolution** | `AI_PROVIDER` (`openai` default, or `gemini`) is tried first, then the other configured provider, then deterministic-only. |
| **Agent run** | One execution, persisted to `agent_runs`, `agent_decisions`, and `agent_messages`. |
| **Decision approval** | A human with `agents:review` approves decisions flagged `requiresHumanReview`. |
