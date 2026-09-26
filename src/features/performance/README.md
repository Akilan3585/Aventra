# Performance

Owns GPA, marks, assignment completion, academic risk metrics, and explainable
student recommendations.

Also owns external platform performance: one `student_platform_profiles`
snapshot per student per platform (LinkedIn, HackerRank, CodeChef, LeetCode,
GitHub). `domain/platform-performance.ts` normalizes each platform's headline
score onto a 0-100 readiness scale and derives bands, student composites, and
campus coverage deterministically; the `/performance` page renders the
dashboard and `application/platform-performance-actions.ts` records snapshots.

Metrics are fetched automatically: an admin links a student's username
(`recordPlatformProfileAction`), and `infrastructure/platform-metrics.client.ts`
reads the public GitHub API and contributions page, the LeetCode GraphQL API,
the CodeChef profile page, and the HackerRank REST API. Pure parsing lives in
`domain/platform-metrics-parsers.ts`. `refreshPlatformMetricsAction` and the
nightly `/api/cron/platform-metrics-sync` (bearer `CRON_SECRET`) re-fetch every
stored handle, three at a time. LinkedIn requires sign-in and forbids automated
collection, so its numbers remain manually entered. Set `GITHUB_TOKEN` to lift
GitHub's 60 requests per hour unauthenticated limit.
