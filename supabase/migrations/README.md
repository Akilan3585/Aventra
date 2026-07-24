# Database migrations

The SQL files in this directory are the only schema authority. Apply them to
the connected Supabase project, then regenerate the application types.

Every publicly exposed table must enable RLS. Policies will be added with Clerk
JWT integration; until then, `anon` and `authenticated` receive no table grants.
