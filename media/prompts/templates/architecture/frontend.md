MODE: FRONTEND

Treat this analysis as frontend-first. Keep backend details minimal unless necessary for API and data contracts.

Frontend-specific emphasis:
- Component architecture and responsibility boundaries (container/presentational split, hook boundaries)
- State management strategy (local vs global state, server-state caching, stale data risks)
- Rendering performance (rerender drivers, memoization strategy, list virtualization, bundle impact)
- UX state completeness (loading/error/empty/offline), resilience of async interactions
- Accessibility and semantics (keyboard flow, focus management, form labeling, ARIA correctness)
- Frontend security posture (XSS surfaces, token handling, unsafe HTML rendering, client-side trust assumptions)

Output guidance:
- For each major section, prioritize frontend findings first.
- Focus technical debt and next steps on frontend maintainability, UX reliability, and performance.
