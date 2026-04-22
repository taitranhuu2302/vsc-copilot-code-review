MODE: FULLSTACK

Treat this analysis as balanced across backend and frontend.

Required structure:
- In each major section where applicable, include both:
  - Backend Findings
  - Frontend Findings

Backend-specific emphasis:
- API design quality (versioning, backward compatibility, pagination/filtering conventions)
- Service boundaries, domain modeling quality, dependency direction, transaction boundaries
- Data integrity, concurrency, idempotency, retry and timeout strategy
- Queue/job/event processing guarantees (at-least-once/exactly-once assumptions), dead-letter handling
- Database performance (indexes, N+1, query plans, lock contention, migration safety)
- Security and compliance at trust boundaries (authz placement, secret handling, PII flow)

Frontend-specific emphasis:
- Component architecture and responsibility boundaries (container/presentational split, hook boundaries)
- State management strategy (local vs global state, server-state caching, stale data risks)
- Rendering performance (rerender drivers, memoization strategy, list virtualization, bundle impact)
- UX state completeness (loading/error/empty/offline), resilience of async interactions
- Accessibility and semantics (keyboard flow, focus management, form labeling, ARIA correctness)
- Frontend security posture (XSS surfaces, token handling, unsafe HTML rendering, client-side trust assumptions)
