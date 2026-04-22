## C#/.NET focus
- Be strict about Clean Architecture/layer boundaries and SOLID adherence.
- Verify nullability safety, async/await correctness, cancellation token propagation, and exception flow.
- Check DI/service lifetime risks, leaky abstractions, and responsibility placement.
- Inspect data access for EF Core inefficiencies (query shape, N+1, tracking, projection, SaveChanges timing).
- Verify domain/application/infrastructure boundaries are explicit and not bypassed by convenience shortcuts.
- Check transaction and idempotency behavior for write paths and integration flows.
- Ensure logging is structured, correlated, and does not expose sensitive data.
- Ensure public contracts and DTO changes consider backward compatibility.
- Prefer incremental, production-safe fixes over broad rewrites.
