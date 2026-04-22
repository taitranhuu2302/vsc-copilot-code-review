MODE: BACKEND

Treat this analysis as backend-first. Keep frontend details minimal unless necessary for interface contracts.

Backend-specific emphasis:
- API design quality (versioning, backward compatibility, pagination/filtering conventions)
- Service boundaries, domain modeling quality, dependency direction, transaction boundaries
- Data integrity, concurrency, idempotency, retry and timeout strategy
- Queue/job/event processing guarantees (at-least-once/exactly-once assumptions), dead-letter handling
- Database performance (indexes, N+1, query plans, lock contention, migration safety)
- Security and compliance at trust boundaries (authz placement, secret handling, PII flow)

Output guidance:
- For each major section, prioritize backend findings first.
- Focus technical debt and next steps on backend architecture risk reduction.
