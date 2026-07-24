# Database boundary

Supabase is the database platform and the official Supabase client is the only
application data client. SQL migrations remain the single source of truth for
schema, indexes, triggers, grants, and row-level security. Client
initialization must be lazy and server-only.
