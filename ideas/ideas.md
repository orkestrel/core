# Orkestrel Core — Understanding, Goals, and Improvement Ideas (prioritized)

This file captures my understanding of the project and what you’re aiming to accomplish, followed by a concrete, prioritized roadmap. It’s grounded in the current README and docs (overview, concepts, patterns, start, providers & lifetimes, api) and updated to reflect your clarified goal: a fully featured DI framework that stays focused and explicit, offering only the necessary auto‑wiring to reduce boilerplate—no decorators and no API overload.

—

My understanding of Orkestrel Core (what it is)
- A focused, strongly-typed DI + lifecycle framework for TypeScript (Node and browser), with an adapter/port model.
- Core building blocks:
  - Ports: TypeScript interfaces that describe capabilities.
  - Tokens: unique runtime identifiers for those port interfaces.
  - Container: small but capable DI container with providers, lazy singletons, and parent/child scopes.
  - Orchestrator: deterministic lifecycle runner that starts/stops/destroys components in dependency order with timeouts and telemetry hooks.
  - Lifecycle (+ Adapter): safe state transitions (created → started → stopped → destroyed) with hook timeouts and event emission.
- TS-first, ESM-only. Zero/near-zero runtime dependencies.
- Global helpers (`container()`, `orchestrator()`) for app glue; libraries can receive explicit instances.

What you’re looking for and trying to accomplish (goals)
- A fully featured DI framework that remains explicit and predictable with a minimal, cohesive API surface.
- “Focused auto‑wiring”: one simple, opt‑in mechanism that reduces boilerplate without hiding complexity.
- Deterministic lifecycle orchestration with great failure handling and telemetry.
- Excellent developer experience: fast start, small mental model, sharp diagnostics.
- Scalable composition: clear feature boundaries and simple assembly patterns.
- Keep async work out of providers; perform it in lifecycle hooks.
- Strong types across public APIs to make misuse obvious at compile time.
- No decorators. Avoid syntactic sugar that masks behavior.

Non-goals and constraints (guardrails)
- No decorators or metadata-based magic; avoid heavy reflection.
- Async providers remain disallowed (no Promise values or async/thenable factories); async belongs in lifecycle hooks.
- Keep dependencies minimal; prefer built-ins and small internal utilities.
- ESM-only, TS-first; portable between Node and browser.
- Prevent API sprawl: prefer extending existing shapes over adding many new helpers.

Success criteria (how we’ll know it’s working)
- New devs can run an example in under a minute and “get” the mental model quickly.
- The single, explicit auto‑wiring option is helpful, opt‑in, and debuggable—never surprising.
- Start/stop/destroy is deterministic; failures roll back; aggregated errors are actionable.
- Scoping and the Manager pattern cover typical needs for many instances without complicating the container.
- Types are precise and guide usage; error messages are consistent and link to docs.
- Core stays dependency-light and maintainable.
- Core tests use real components and built‑ins only (no mocks, fakes, or spies); user docs show how to use fakes/mocks/spies for external dependencies or third‑party APIs.

—

Testing file naming convention
- Tests mirror source files one-to-one using the pattern: `tests/[source filename].test.ts`.
- Do not create auxiliary test files with different names; instead, add new test cases to the existing test file for the corresponding source.
- Example: tests for `src/orchestrator.ts` live in `tests/orchestrator.test.ts` (including property-based tests, edge cases, and helpers used only by tests).

—

Roadmap (prioritized)
Legend: Complexity S/M/L; Reward High/Med/Low.
Each item includes what/why/how, affected files, risk, and a success check.

1) README “60‑second start” and tiny mental model
- Complexity: S, Reward: High
- What: Add a copy/paste Quickstart with 3 steps and a 4‑bullet “How it works” mental model.
- Why: Beginners land here first; faster time‑to‑first‑success reduces churn.
- How: Extend README’s Run locally block with a minimal sample; link Start and Patterns prominently.
- Files: README.md; docs/start.md.
- Risk: None.
- Success: A new user can run an example in under a minute without leaving README.

2) Error polish and diagnostics links
- Complexity: S, Reward: Med/High
- What:
  - Tweak Registry.resolve() error message quoting.
  - Ensure consistent diagnostics formatting and docs links across modules.
- Why: Crisper errors reduce confusion and speed up troubleshooting.
- How:
  - In src/registry.ts, use template: `No ${label} instance registered for '${String(key)}'`.
  - Centralize message formatting via diagnostics helpers where appropriate.
- Files: src/registry.ts; src/diagnostics.ts.
- Risk: Very low.
- Success: Tests still green; error messages read cleanly.
- Status: Done (2025‑10‑01, v1.2.0)

2a) Helper/Registry ergonomics (consistency and safety)
- Complexity: S, Reward: Med
- What:
  - Ensure helper setters use consistent ordering: `set(name, value, lock?)`.
  - Registry `set` uses a boolean third parameter `lock` (default false), mirroring `clear(name, force)`.
  - Decision: rely on TypeScript types in helpers; no runtime validation in `set`.
- Why: Consistent ergonomics with minimal runtime surface; TS types are sufficient for our audience.
- Files: src/container.ts (helper), src/orchestrator.ts (helper), src/registry.ts (boolean lock only), docs/api.md, CHANGELOG.md, tests/*.
- Risk: Low.
- Success: Consistent helper signatures; docs and changelog accurately describe the API; tests pass.
- Status: Done (2025‑10‑01, v1.2.0)

2b) Lifecycle API consolidation and simpler shutdown
- Complexity: S/M, Reward: High
- What:
  - Unify orchestrator lifecycle methods:
    - `start(regs?)` registers any provided components and starts all lifecycles in dependency order (replaces `startAll`).
    - `stop()` stops started components in reverse dependency order (replaces `stopAll`).
    - `destroy()` performs a single consolidated pass: stops components as needed, then destroys them, and finally destroys the container (replaces `destroyAll`).
  - Diagnostics messages harmonized (examples):
    - Start aggregation: ORK1013 “Errors during start”.
    - Stop aggregation: ORK1014 “Errors during stop”.
    - Destroy aggregation: ORK1017 “Errors during destroy”.
- Why: A simpler, more intuitive lifecycle surface and a one‑call shutdown path reduce cognitive load and boilerplate in apps and examples.
- How:
  - Update orchestrator API and internal flow; remove legacy plural methods.
  - Update docs and examples to use `start([...])` and a single `destroy()` for shutdown; clarify when `stop()` is appropriate.
- Files: src/orchestrator.ts; docs/*; examples/*; tests/*.
- Risk: Low/Med (method renames); migration is mechanical and supported by clear diagnostics.
- Success: Examples and docs use `start()`/`stop()`/`destroy()`; semantics unchanged for ordering; aggregated error codes are stable and branded.
- Status: Done (2025‑10‑01, v1.3.0)

3) Uniform diagnostics: branded message templates + error codes (+ docs links)
- Complexity: S/M, Reward: High
- What:
  - Introduce a centralized diagnostics/messages module with stable codes and templates. Prefix messages `[Orkestrel][ORK1001] …`.
  - Attach a help URL to every message: templates carry a default docs link; callers can override per call.
  - Add an optional `code` field to LifecycleError and AggregateLifecycleError; include `code` in LifecycleErrorDetail.
  - Replace ad‑hoc strings (duplicate registration, unknown dependency, cycles, async provider guards, aggregator messages) with templates.
- Why: Consistency, grep‑ability, easier testing (assert codes), and better UX; embedded links guide users quickly.
- How:
  - New src/diagnostics.ts exporting codes, templates, help links, and helpers `format/makeError/makeDetail`.
  - Update src/errors.ts to carry `code` and optional `helpUrl`.
  - Update src/orchestrator.ts, src/container.ts, src/registry.ts to use diagnostics.
  - Docs: add/align anchors; optionally an Error codes index.
  - Tests: assert codes and message prefix; check helpUrl ends with expected path/anchor.
- Files: new src/diagnostics.ts; src/errors.ts; src/orchestrator.ts; src/container.ts; src/registry.ts; tests/*; docs/*.
- Risk: Low/Med — message text changes; mitigate via codes and stable anchors.
- Success: All error paths produce branded, coded messages with a helpful URL; aggregates include code/helpUrl; tests pass.
- Status: Done (2025‑10‑01, v1.2.1)

4) Minimal explicit injection (single opt‑in mechanism; no decorators)
- Complexity: M, Reward: High
- What:
  - Extend provider options with a single `inject` spec to resolve dependencies explicitly when constructing values:
    - For `useClass`: `inject` is an array of tokens matching constructor parameter order.
    - For `useFactory`: `inject` is an array of tokens matching factory parameter order.
    - Named-object form optional for readability when using factories: `{ log: Ports.logger, cfg: Config }`, passed to the factory as a single object.
  - Keep providers synchronous; the container resolves tokens at creation time per the inject spec.
- Why: Reduces boilerplate while staying explicit and reflection‑free; avoids multiple helpers and avoids decorators.
- How:
  - Update provider union type to allow `{ useClass, inject?: Token<unknown>[] } | { useFactory, inject?: Token<unknown>[] | Record<string, Token<unknown>> }`.
  - Container creation path reads `inject` and resolves values via existing `resolve()`.
  - Docs: demonstrate both array and object forms; emphasize explicitness and debuggability.
- Files: src/container.ts; docs/patterns.md; docs/start.md; tests/container.test.ts.
- Risk: Med — new option on existing provider shapes; defaults unchanged.
- Success: Array/object injection works; no new helper functions; tests cover both forms.
- Status: Done (2025‑10‑01, v1.2.2)

5) Module system (future; explicit, no decorators)
- Complexity: M/L, Reward: High
- What: Define a lightweight module abstraction to group providers and expose tokens. Support `imports`, `exports`, and `startModule(module)` that compiles and starts.
- Why: Scales composition; encourages boundaries; simplifies bootstrapping larger apps.
- How:
  - Shape: `type Module = { providers: OrchestratorRegistration<any>[]; exports?: Token<any>[]; imports?: Module[] }`.
  - Provide `compileModule(module)` that flattens imports, checks duplicate providers/conflicts, and returns a deduped provider list.
  - Orchestrator: `startModule(module)` convenience that compiles and starts.
  - Docs: module patterns, circular import guidance.
- Files: src/orchestrator.ts; src/modules.ts (new); examples/large/ (update). Note: Keep module docs out of the main docs until we decide to expose them publicly.
- Risk: Med — new composition layer; keep it optional and transparent.
- Success: Large example can be expressed as modules; tests verify exports/imports and dedup.
- Status: Planned

6) Singleton-only lifetimes with scopes and Manager pattern (clarify, not new lifetimes)
- Complexity: S/M, Reward: High
- What: Affirm and document that all providers are singletons; use `using`/child containers for scoping; for many instances, prefer a Manager (singleton) that owns child lifecycles internally.
- Why: Keeps the core simple and explicit; avoids container-level transient/scoped lifetimes and multi-binding complexity.
- How:
  - Docs: enrich providers-and-lifetimes and patterns with manager guidance and scoping examples; ensure no references to external manager docs in core.
  - Optional: keep a portable manager write-up alongside the repo (out of core docs) to migrate later to an adapters package.
- Files: docs/providers-and-lifetimes.md; docs/patterns.md; examples/* (optional tiny manager example later).
- Risk: Low.
- Success: Developers understand how to model transients via a Manager; no container complexity added.
- Status: Planned

7) Interceptors (opt‑in, minimal)
- Complexity: M, Reward: Med
- What: Provide a minimal mechanism to wrap resolved instances with method-level interceptors via provider options.
- Why: Enables common cross‑cutting concerns (logging, metrics, retries) without extra libraries.
- How:
  - Provider options accept `interceptors?: Interceptor[]`.
  - Interceptor shape: `(ctx: { target, method, args }, next) => unknown`.
  - Container wraps instances with a lightweight proxy when interceptors are supplied; no decorators, no global hooks.
  - Docs: performance considerations; keep opt‑in and explicit.
- Files: src/container.ts; docs/patterns.md; tests/*.
- Risk: Med — proxies can affect perf if overused; stays opt‑in.
- Success: Interceptors apply predictably; opt‑out leaves instances untouched.
- Status: Planned

8) Testing ergonomics (overrides, fakes, harness)
- Complexity: S/M, Reward: Med/High
- What: Small helper to override providers for tests using existing APIs without introducing many new functions. Provide guidance for using fakes/mocks/spies in consumer apps when interacting with external dependencies or third‑party APIs.
- Why: Encourages good testing practices for consumers while keeping core simple and real; the core repo itself avoids fakes/mocks/spies to ensure real‑world signal in tests.
- How:
  - Add a single `using(overrides, fn)` overload on Container that creates a child, applies overrides, runs `fn`, destroys child.
  - Docs (`docs/testing.md`): show patterns for fakes vs spies for external systems; clarify policy: core tests must not use fakes/mocks/spies.
- Files: src/container.ts; docs/testing.md; tests/*.
- Risk: Low.
- Success: Consumer tests are simpler via the overload; core tests remain free of fakes/mocks/spies and rely on real components and built‑ins only.
- Status: Done (2025‑10‑02) — added `Container.using(apply, fn)` overload, tests, and docs examples.

9) Reduce duplication in Container map resolution
- Complexity: S, Reward: Med
- What: Factor shared map-walking logic for resolve()/get() overloads into one private helper.
- Why: Smaller surface and fewer branches reduce future regressions.
- How: Introduce `private retrievalMap(tokens, strict: boolean)` and reuse in resolve()/get().
- Files: src/container.ts.
- Risk: Low.
- Success: No behavior change; lines of code reduced; tests pass.
- Status: Done (2025‑10‑02)

10) Lifecycle ergonomics and event hygiene
- Complexity: S, Reward: Med
- What:
  - Avoid emitting stateChange when from === to (create hook goes created→created).
  - Document hook timeout default and onTransition filter with examples.
  - Ensure initial state emission can be toggled (option e.g., emitInitialState = true).
- Why: Cleaner event streams and clearer mental model.
- How: Guard setState to no-op if same; extend LifecycleOptions; docs.
- Files: src/lifecycle.ts; docs/start.md; docs/api.md.
- Risk: Low; compatible default behavior.
- Success: New tests show no duplicate created event; options covered in docs.
- Status: Done (2025‑10‑02)

11) Orchestrator options: timeouts defaults, events, tracing hooks
- Complexity: S/M, Reward: Med/High
- What:
  - Timeouts defaults already supported; ensure docs and API are crisp.
  - Add optional debug tracer: emit computed topo layers and per‑phase decisions.
- Why: Experts diagnosing production start/stop can “see” the plan quickly.
- How: Extend OrchestratorOptions with `tracer?: { onLayers?, onPhase? }` and stable JSON shapes; guard behind option.
- Files: src/orchestrator.ts; docs/api.md; docs/tips.md.
- Risk: Low.
- Success: Debug snippet prints layers/timings with zero cost when disabled.
- Status: Done (2025‑10‑02)

12) Concurrency control per layer (limit parallelism)
- Complexity: M, Reward: Med
- What: Allow start/stop concurrency limits (e.g., 4 at a time) for resource-heavy graphs.
- Why: Reduces startup spikes; improves predictability in constrained environments.
- How: Add option `concurrency?: number` to OrchestratorOptions and per-registration override; implement a tiny internal limiter (queue + counter) — no external libs.
- Files: src/orchestrator.ts (option + usage); src/internal/limit.ts (new small helper).
- Risk: Med (new execution behavior paths); default remains unlimited.
- Success: Tests verify cap is respected; no API break by default.
- Status: Done (2025‑10‑02)

13) Events for telemetry (polish)
- Complexity: S, Reward: Med
- What: Provide `events` callbacks on the orchestrator with clear types and examples; ensure error details carry useful context.
- Why: Centralized logging/metrics become easy and consistent.
- How: Confirm shapes; add docs and examples; consider tying into diagnostics codes.
- Files: src/orchestrator.ts; docs/patterns.md; docs/tips.md.
- Risk: Low.
- Success: Users can plug in telemetry in minutes.
- Status: Done (2025‑10‑02) — added a "Telemetry events (practical logging)" section to docs/tips.md with examples; OrchestratorOptions already exposes strong types for events.

14) Docs: FAQ + Troubleshooting
- Complexity: S/M, Reward: Med
- What: Common issues (async providers not allowed, cycle detection, timeouts, scoping/manager pattern) with remedies and snippets.
- Why: Reduces GitHub issues; empowers beginners.
- How: New docs/faq.md; link from README and Tips.
- Files: docs/faq.md; README.md; docs/tips.md.
- Risk: None.
- Success: Clear guidance exists for top 5 failure modes.
- Status: Done (2025‑10‑02) — added docs/faq.md and linked it from README quick links.

15) Testing: fast and deterministic (no coverage tooling)
- Complexity: S, Reward: High
- What:
  - Keep tests fast by structuring timeouts/delays to very small values; avoid external timer-mocking libs.
  - Ensure tests avoid flakiness by favoring deterministic assertions and small, isolated scenarios.
  - Enforce policy in the core repo: no mocks, fakes, or spies; tests should exercise real behaviors with built‑in primitives only.
- Why: Confidence and speed without adding dependencies; real‑world signal over synthetic doubles.
- How:
  - Tune existing timeout tests (already using ~10–30ms) to remain snappy and reliable.
  - Keep tests concise and mapped directly to source behaviors; add happy-path + edge cases only where needed.
  - Document the policy in `docs/testing.md` and contribution guidelines.
- Files: tests/*.test.ts (minor tuning where helpful); docs/testing.md; docs/contribute.md (policy note).
- Risk: Low; behavior stays the same.
- Success: Tests finish quickly and deterministically and do not use fakes/mocks/spies.
- Status: Done (2025‑10‑02) — added docs/testing.md with policy and examples; existing tests already conform and run fast.

16) Property-based tests for topology and rollback (internal generators)
- Complexity: M/L, Reward: Med/High
- What: Generate random DAGs, register lifecycles, assert topo constraints and rollback invariants.
- Why: Increases confidence in the orchestrator under many shapes.
- How: Implement a tiny internal, seeded PRNG and DAG generator in tests (no fast-check). Bound size/iterations to keep runtime low.
- Files: tests/orchestrator.test.ts (using only node:test + internal helpers).
- Risk: Med (test complexity); keep runtime limited.
- Success: Properties stable across seeds; no flakes; no extra deps.
- Status: Done (2025‑10‑02) — property-based tests consolidated into `tests/orchestrator.test.ts` using a small seeded LCG; validates topological start/stop order and rollback stops; no new dependencies.

17) API reference via TSDoc (no generator dependency)
- Complexity: M, Reward: Med
- What: Add TSDoc comments across public API and keep docs/api.md in sync.
- Why: Accurate docs for both beginners and experts without adding tools.
- How: Maintain docs/api.md manually, sourced from TSDoc comments; optionally add a minimal internal script using the TypeScript compiler API to extract symbol names and signatures — no new packages.
- Files: src/*; docs/api.md; scripts/extract-api.ts (optional, internal).
- Risk: Low/Med (manual discipline or small script to assist).
- Success: API docs reflect code truth; links from README.
- Status: Done (2025‑10‑02) — added TSDoc across core public APIs (container, orchestrator, ports, emitter) and aligned docs/api.md; no generator dependency and no runtime/API changes.

18) Examples: “Web adapter” and “Worker adapter” patterns
- Complexity: M/L, Reward: Med
- What: Two practical adapters showing Lifecycle around HTTP server and worker loop with graceful stop/destroy.
- Why: Shows how to model real services; helps adoption.
- How: New examples/web-server.ts and examples/worker.ts; short docs sections.
- Files: examples/*; docs/examples.md.
- Risk: Low.
- Success: Examples run locally and demonstrate lifecycles clearly.
- Status: Planned

19) Optional internal runtime guards for telemetry shapes
- Complexity: L, Reward: Low/Med
- What: Provide tiny internal type guards (no zod) for LifecycleErrorDetail and diagnostics payloads.
- Why: Consumers can validate in pipelines without adding dependencies.
- How: Export `isLifecycleErrorDetail(x: unknown): x is LifecycleErrorDetail` and similar guards; keep them simple and fast.
- Files: src/errors.ts (guards) or new src/telemetry.ts; docs/tips.md.
- Risk: Low/Med.
- Success: Guards available without impacting core bundle size; no new deps.
- Status: Done (2025‑10‑02) — added `isLifecycleErrorDetail` in diagnostics, tests, and docs mention.

20) Tokens: symbol-only (baseline)
- Complexity: S, Reward: Med/High
- What: Tokens are plain symbols (`Token<T> = symbol`) created with `Symbol(description)`. Use `token.description ?? String(token)` for human-friendly diagnostics.
- Why: Simple runtime and mental model; aligns with common DI patterns; easy discrimination (`typeof x === 'symbol'`).
- How:
  - `createToken(desc)` returns a unique `symbol` with the provided description.
  - The container uses the symbol itself as the registry key and supports resolving token maps with precise typing.
  - Diagnostics use `tokenDescription(symbol)` to produce readable labels.
- Files: src/container.ts; src/orchestrator.ts; src/ports.ts; docs/*; tests/*.
- Risk: Low (design baseline; no migration).
- Success: All tests pass; docs and API reference describe tokens as symbols; examples use `createToken` and `createPortTokens` consistently.
- Status: Done (2025‑10‑02)

—

Notes grounding the plan (from current repo/docs)
- Container/Token/Registry are well‑factored. Helper setters are consistent (`set(name, value, lock?)`) and rely on TypeScript types; no runtime validation in helpers. `Registry` remains simple (no validators).
- Orchestrator already guards async providers and orders by deps; tracing hooks and concurrency caps increase control without changing defaults. Lifecycle API is now unified to `start()`/`stop()`/`destroy()` with a one‑call shutdown path.
- Lifecycle semantics are strong; small event hygiene tweaks improve signal/noise.
- Auto‑wiring is explicit and opt‑in via a single `inject` option on providers (planned); there are no decorators and no extra helper surface.
- Many instances are modeled via the Manager pattern; we avoid container‑level transients and multi‑binding.
- Diagnostics are hand‑authored in places (planned to be centralized); a small diagnostics module with codes makes errors actionable and greppable.
- Testing policy: the core repository does not use fakes/mocks/spies in its tests; consumer guidance illustrates their use for external dependencies or third‑party APIs only.

Quick try commands (optional)
- Run tests
  ```bat
  npm run check
  npm run format
  npm test
  ```
- Run examples
  ```bat
  npm run example:simple
  npm run example:large
  ```

Suggested execution sequence
- Week 1: Items 1–6
- Week 2: Items 7–11
- Week 3: Items 12–16
- Later: Items 17–20 as needed
