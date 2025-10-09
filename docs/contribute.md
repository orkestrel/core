# Contribute

This guide merges the essential contribution rules and engineering blueprints so both humans and coding agents can work effectively within @orkestrel/core.

## Purpose and audience
- Audience: contributors and automated agents working on @orkestrel/core.
- Goal: keep the codebase focused, explicit, and deterministic while enabling a fully featured DI + lifecycle framework with a small, cohesive API surface.

## Guidance for automated agents
- Follow testing convention strictly: tests live in `tests/[source filename].test.ts`; add new cases to existing files.
- Do not expand the public API without a concrete, multi-site use case; prefer small extensions to existing shapes.
- Preserve determinism: maintain insertion and declared dependency order; document any tie-breaking.
- Providers must be synchronous only; move async to lifecycle hooks with timeouts.
- Keep ports minimal and adapters in-memory; avoid Node-only APIs for portability.
- Types must be strict: no `any`, avoid non-null assertions; prefer `readonly` for public results.
- On changes, run: `npm run check`; `npm test`; `npm run format`; `npm run build`.

## Repo setup and scripts
Useful scripts:
- `npm run build` — compile `src` to `dist`
- `npm test` — run tests with `tsx --test`
- `npm run check` — type-check src, examples, and tests
- `npm run format` — ESLint autofix

Node/browser targets:
- TypeScript-first, ESM-only (`"type": "module"`)
- NodeNext module resolution
- Portable APIs only; avoid Node-only primitives in core adapters

## Development workflow
1) Edit source in `src/`
2) Add/adjust tests in `tests/` (see “Testing conventions” below)
3) Run `npm test` locally
4) Type-check everything with `npm run check`
5) Build with `npm run build`

## Project conventions and guardrails
- No decorators or metadata-based magic; avoid heavy reflection
- Providers are synchronous only (no async values/factories); move async into lifecycle hooks
- Keep dependencies minimal; prefer built-ins and small internal utilities
- Strict typing; avoid `any`; prefer `readonly` for public shapes
- Keep adapters side-effect free on import
- Prefer explicit DI; helpers are for app glue, not libraries
- Public surface stays small; grow via narrowly scoped extensions backed by real use cases

## Success criteria snapshot
- New devs can run an example quickly and grasp the mental model
- Single, explicit auto‑wiring option is opt‑in and debuggable—never surprising
- Lifecycle is deterministic with solid rollback and actionable errors
- Scoping and Manager pattern cover typical needs without complicating the container
- Types are precise and guide usage; diagnostics are consistent and linkable
- Core stays dependency-light and maintainable
- Core tests use real components only (no mocks/fakes/spies); consumers may use doubles at app boundaries

---

# Ports + Adapters blueprint (core-friendly, reusable, deterministic)

Objective
- Extract logic into narrowly defined ports with thin, in‑memory adapters that:
  - Are generic and reusable across packages (browser/server)
  - Preserve deterministic behavior and core diagnostics
  - Fit natively into @orkestrel/core without vendor coupling or option sprawl

Golden rules
- Keep contracts minimal and explicit; prefer the smallest API that covers common needs
- Adapters are in-memory by default; no external dependencies in core adapters
- Determinism is a feature: preserve insertion order and declared dependency order
- Strong typing only:
  - No `any`. Avoid non-null assertions and unsafe casts
  - Prefer `readonly` results and explicit undefined checks
- Public surface stays small; complexity lives in private helpers
- Use core diagnostics (D.*) and isolate listener errors (safeCall)

Contracts (ports)
- Define the smallest set of methods needed for broad reuse, not just a single call site
- Prefer generic types and stable shapes that work in both browser and Node
- Avoid option surfaces unless proven necessary by multiple use cases

Adapters
- In-memory, deterministic, and side-effect free (unless the primitive is about side effects)
- Break compute/heavy logic into private helpers for readability/testability
- Maintain an internal version/caching policy; invalidate deterministically on mutation
- Do not expose subclass hooks; composition over inheritance

Determinism policy
- Respect insertion/registration order when computing initial frontiers, queues, or batches
- Respect declared input order where it impacts traversal/enqueueing
- If tie-breaking is required, make it stable and documented—avoid relying on incidental map ordering beyond insertion

Diagnostics and errors (core codes)
- Unknown dependency → ORK1008
- Cycle detected → ORK1009
- Async provider guards:
  - Async `useValue` → ORK1010
  - Async `useFactory` (async fn) → ORK1011
  - Async `useFactory` (returned Promise) → ORK1012
- Aggregates:
  - Errors during start → ORK1013
  - Errors during stop → ORK1014
  - Errors during destroy → ORK1017
- Lifecycle:
  - Invalid transition → ORK1020
  - Hook timeout → ORK1021
- Aggregate via `AggregateLifecycleError`. Format messages with `[Orkestrel][CODE]` via `D`.

Providers and lifecycle (core constraints)
- Providers are synchronous only. Guard at registration:
  - `useValue` must not be a Promise (throw ORK1010)
  - `useFactory` must not be `async` (throw ORK1011)
  - `useFactory` must not return a Promise (throw ORK1012)
- Wrap factories to assert sync-only while preserving signatures
- Keep async work in `Lifecycle` hooks (`onStart`, `onStop`, `onDestroy`) with timeouts

Orchestration policy
- Start in dependency order, parallelized within each layer
- Stop/destroy in reverse dependency order
- On start failure: rollback by stopping all previously started components in reverse layer order
- Enforce phase timeouts; surface `TimeoutError` details
- Honor per-layer concurrency limits for start/stop/destroy

Tracing
- `tracer.onLayers`: emit once with descriptive layers (e.g., string token descriptions)
- `tracer.onPhase`: emit per phase/layer only if outcomes exist (no empty-layer emissions)
- Wrap listener calls with `safeCall` to isolate errors from outcomes

TypeScript discipline
- No `any`. No forced casts. Narrow with checks; handle `undefined` from maps/gets
- Prefer `readonly` in public types; avoid mutating outputs
- Keep internal helpers private and well-typed; document invariants in comments

### Guard utilities (runtime narrowing)
Guards make runtime checks explicit and keep conditionals simple while informing the type system. Core guards live in `src/helpers.ts` and include:
- Primitives and shapes: `isObject`, `isString`, `isBoolean`, `isFiniteNumber`
- Collections and literals: `arrayOf(elemGuard)`, `literalOf('a', 'b')`
- Safe key checks: `hasOwn(obj, ...keys)` (overloaded to preserve original object type)
- Schema checks: `hasSchema(obj, schema)` with `FromSchema` inference for nested records
- Tokens: `isToken`, `isTokenArray`, `isTokenRecord`
- Providers: `isValueProvider`, `isFactoryProvider`, `isClassProvider` and their tuple/object/container/no‑dep variants
- Async shape checks: `isAsyncFunction`, `isPromiseLike`
- Domain guards: e.g., `isLifecycleErrorDetail` for aggregated lifecycle errors

Use guards to narrow unions incrementally instead of branching with ad‑hoc property access or relying on casts. When a guard returns true, the compiler understands the refined type for that branch without assertions.

### Typing ethos (strict, informative, incremental)
Our types should be precise at the boundaries and helpful during implementation:
- Strict by default: avoid `any`, non‑null assertions, and unsafe `as` casts
- Preserve original intent: prefer narrowing and generics/overloads to “force” a type
- Incremental refinement: start from the broad, known type and constrain it based on validated facts (via guards or structural checks)
- Honest boundaries: accept `unknown` from the outside world, validate at the edges, and re‑expose typed results
- Readability: prefer `readonly` in public APIs and avoid mutating outputs; keep helpers small and well‑typed

This approach keeps code safe at runtime while preserving rich editor hints and making branch logic self‑documenting.

---

## Testing and QA
- Use real in-memory adapters; do not mock/fake in core tests
- Cover success/failure/timeout, concurrency caps, determinism (ordering), and aggregation behavior
- For graph-like logic, include property-based checks on random DAGs when useful
- CI gates: typecheck clean, lint clean, deterministic assertions

## Naming and tokens
- Ports live behind tokens (e.g., `createPortToken` or `createPortTokens`)
- Use `tokenDescription` for diagnostics and tracing payloads

## Change control
- Keep ports stable; avoid breaking changes
- If a port must evolve, add narrowly scoped methods backed by real use cases; document rationale

Reference checklist — new Port
1) Define minimal interface with strongly typed, readonly shapes
2) Keep methods few and necessary (e.g., `compute()`, `group()`)
3) Add a small example or doc linking to demos/tests

Reference checklist — new Adapter (in-memory)
1) Implement the port with strict types; no `any`
2) Ensure determinism by preserving insertion and declared order
3) Split `compute` into private helpers
4) Add caching keyed by mutation version; invalidate on `set/upsert/remove`
5) Validate strictly and throw core diagnostics (or let caller validate and standardize throws)
6) Write tests: ordering, cycles, error cases, concurrency (when applicable), property-based if useful

Example policy snapshot — LayerAdapter
- Public API: `set`, `upsert`, `remove`, `compute`, `group`
- Determinism: insertion order for initial frontier; dependency order for adjacencies
- Strict validation: caller (orchestrator) throws ORK1008 for unknown deps; adapter detects cycles; orchestrator surfaces ORK1009
- Performance: O(V + E) Kahn layering; O(V + E) space
- Output: `layers`, `order`, `layerIndex`; `group()` returns ids bucketed by descending layer

---

## Testing conventions
- Tests mirror source files one‑to‑one using: `tests/[source filename].test.ts`
- Do not create auxiliary test files with different names; fold new cases into the existing file for that source
- Example: tests for `src/orchestrator.ts` live in `tests/orchestrator.test.ts` (including property-based tests, edge cases, and any helpers used only by tests)

Quick try commands
- Run checks
  - `npm run check`
  - `npm run format`
  - `npm test`

## Documentation
- Top‑level guides live in `docs/` with single‑word filenames
- README is a concise index; deep dives live in the docs
- When adding new APIs, update `docs/api.md` with signatures and examples

## Code of Conduct
Be kind. Assume good intent. Discuss ideas, not individuals.
