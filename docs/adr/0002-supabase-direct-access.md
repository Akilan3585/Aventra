# ADR 0002: Use Supabase directly

## Status

Accepted.

## Decision

Use Supabase as the application's database, Storage, Realtime, and migration
platform through the official `@supabase/supabase-js` client and Supabase SQL
migrations. Prisma is not used.

## Consequences

There is one schema and migration authority. Application data access uses
generated Supabase TypeScript types once the database schema exists. All
exposed tables require row-level security and tests for their policies.
