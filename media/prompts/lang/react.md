## React/frontend focus
- Be strict about hook correctness, dependency arrays, stale closures, and effect cleanup.
- Check rendering performance risks: unnecessary rerenders, unstable references, expensive render work.
- Validate loading/error/empty states, controlled inputs, async UI races, and state ownership boundaries.
- Flag components that carry too many responsibilities; recommend splitting by concern (data fetching, state orchestration, presentation, and reusable UI pieces) when complexity grows.
- Call out large JSX blocks and deeply nested conditionals that should be extracted into smaller components or custom hooks.
- Verify state is kept as local as possible and lifted only when necessary; identify prop-drilling pain points and context misuse.
- Check list rendering scalability (stable keys, pagination/virtualization when relevant).
- Review accessibility basics: semantic elements, labels, keyboard flow, and focus handling.
- Prefer smallest safe fixes; recommend memoization only when there is clear measurable benefit.
