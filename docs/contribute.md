# Contribute

A compact guide so humans and coding agents can ship high‑quality changes to @orkestrel/core with confidence.

## Principles (what we optimize for)
- Determinism: same inputs, same outputs; preserve insertion and declared dependency order
- Strong typing: strict types with zero `any`, no non‑null assertions, and honest boundaries
- Small surface: minimal, composable APIs; real use cases drive growth
- Portability: browser + Node compatible by default; in‑memory adapters in core
- Predictable lifecycles: sync providers, async work in lifecycle hooks with timeouts

## Quick workflow (how to work)
1) Edit source in `src/`
2) Mirror tests in `tests/` (one test file per source file)
3) Run locally:
   - `npm run check` — typecheck everything
   - `npm test` — run unit tests
   - `npm run format` — lint + autofix
   - `npm run build` — build types and ESM

Node/browser targets
- TypeScript‑first, ESM‑only (`"type": "module"`), moduleResolution: bundler
- No Node‑only primitives in core adapters or public APIs

## Typing ethos (strict, helpful, honest)
- No `any`. No non‑null assertions (`!`). Avoid unsafe casts; prefer narrowing
- Validate at the edges: accept `unknown` from the outside world, check, then type
- Prefer `readonly` for public outputs; avoid mutating returned values
- Keep helpers small and well‑typed; document invariants where helpful
- Use provided guards from `src/helpers.ts` to narrow unions incrementally

If you must widen or coerce, write a guard instead and cover it with tests.

## API and change control
- Do not expand the public API without a concrete, multi‑site use case
- Prefer tiny extensions to existing shapes over new abstractions
- Keep ports stable; evolve via narrowly scoped, additive methods with rationale

## Providers and lifecycle (core constraints)
- Providers are synchronous only
  - `useValue`: must not be a Promise (sync only)
  - `useFactory`: must not be `async` and must not return a Promise
- Move async work to `Lifecycle` hooks (`onStart`, `onStop`, `onDestroy`) with per‑phase timeouts
- On start failure, rollback deterministically (stop previously started components in reverse order)

Diagnostics (selected)
- Unknown dependency → ORK1008
- Cycle detected → ORK1009
- Async provider guards → ORK1010/ORK1011/ORK1012
- Aggregates on start/stop/destroy → ORK1013/ORK1014/ORK1017
- Invalid transition / Hook timeout → ORK1020 / ORK1021

## Ports + adapters (deterministic, reusable)
- Contracts: minimal, explicit, generic where useful; browser + Node friendly
- Adapters: in‑memory, side‑effect free on import; deterministic order
- Composition over inheritance; keep heavy logic in private helpers
- Caching: invalidate deterministically on mutation
- Use core diagnostics (`D.*`) and isolate listener errors via `safeCall`

Determinism policy
- Respect insertion order for initial frontiers/queues; respect declared input order
- If tie‑breaking is required, make it stable and document it

## Testing conventions and QA
- Tests mirror source files: `tests/[file].test.ts`
- Use real in‑memory adapters; no mocks/fakes/spies in core tests
- Cover: success/failure/timeout, concurrency caps, ordering/determinism, aggregation
- CI gates (local parity): typecheck clean, lint clean, tests green

## Naming and tokens
- Ports live behind tokens; use `tokenDescription` for diagnostics/tracing payloads
- Prefer `createPortToken` / `createPortTokens` and `extendPorts` for stable, typed maps

## Guidance for automated agents
- Keep determinism; document any tie‑breaking
- Do not add new public APIs without a compelling multi‑site need
- Providers stay synchronous; move async into lifecycle hooks
- Ports minimal, adapters in‑memory; avoid Node‑only APIs in core
- Strict types: no `any`, no non‑null assertions; prefer `readonly` results
- Update tests alongside code; add new cases to the existing file
- Use the quick workflow commands before proposing changes

## Documentation
- Top‑level guides live in `docs/`; keep filenames short and focused
- README is an index; deeper content lives here (update `docs/api.md` for new APIs)

## Code of Conduct
Be kind. Assume good intent. Discuss ideas, not people.
