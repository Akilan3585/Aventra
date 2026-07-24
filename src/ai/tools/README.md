# Agent tools

Tool implementations are server-only application services. Every tool validates
its input, enforces actor permissions, records an audit event, and returns a
typed result. Agents never access the database directly.
