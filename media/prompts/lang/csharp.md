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

## C# version-aware syntax rules
Before flagging any syntax as invalid, determine the effective C# language version:
- Check `<TargetFramework>` in relevant `.csproj` files.
- net8.0 → C# 12; net9.0 → C# 13. Do NOT flag features that are valid for that version.
- C# 12 valid features (do NOT flag as errors):
  - Collection expressions: `[] `, `[1, 2, 3]` for List<T>, IEnumerable<T>, HashSet<T>, arrays, etc.
  - Primary constructors on classes and structs.
  - Default lambda parameters.
  - Inline arrays.
- C# 11 valid features: raw string literals, required members, file-scoped types, generic attributes.
- Only flag syntax as invalid if you have confirmed the target framework does NOT support it.
- If `.csproj` is not in the diff and version is unknown, state "Cannot validate — target framework not visible in diff" instead of assuming an older version.