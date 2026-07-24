# Aventra AI

Production-oriented Smart Campus Management platform built with Next.js,
TypeScript, Supabase, Clerk, and tool-driven AI agents.

## Current milestone

Milestone 1 establishes the application shell, modular architecture, design
tokens, feature ownership, AI contracts, direct Supabase connection, database
migration policy, RBAC model, and health endpoint. Database models,
authentication wiring, and live agents are deliberately deferred to their
dedicated milestones.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm check
```

Copy `.env.example` to `.env.local` when external services are configured.

Architecture decisions are documented in `docs/adr`.
