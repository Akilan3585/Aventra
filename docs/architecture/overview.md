# Architecture overview

Aventra AI is a modular monolith deployed as one Next.js application. Product
capabilities are isolated by feature, while cross-cutting infrastructure is
kept behind server-only boundaries.

## Dependency direction

1. `app` composes routes and calls feature public APIs.
2. `features` own business capabilities and may depend on `shared` contracts.
3. `ai` orchestrates feature services exclusively through authorized tools.
4. `server` implements Supabase access, authorization, audit, and integration
   details.
5. `design-system` contains reusable visual foundations, primitives, and
   patterns; it cannot import product features.

Direct database access from pages, client components, or agents is prohibited.
