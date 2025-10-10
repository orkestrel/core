# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire implementations via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser
- Requires Node 18+

## Install
```
npm install @orkestrel/core
```

## Quickstart
Define a port, register an implementation, start, use, and clean up.

```ts
import { createPortTokens, orchestrator, register, container } from '@orkestrel/core'

interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as EmailPort })

class ConsoleEmail implements EmailPort {
  async send(to: string, subject: string, body: string) {
    console.log('[email]', { to, subject, body })
  }
}

await orchestrator().start([
  register(Ports.email, { useFactory: () => new ConsoleEmail() }),
])

await container().resolve(Ports.email).send('me@example.com', 'Hi', 'Welcome!')

// Single-call shutdown: stop/destroy as needed
await orchestrator().destroy()
```

## Concepts (at a glance)
- Ports & Tokens: describe capabilities (Email, Logger, etc.) via tokens created with `createPortToken(s)`.
- Container: tiny DI to register value/factory/class providers and resolve by token; supports child scopes via `using()`.
- Orchestrator: registers components, validates dependencies, and runs lifecycles in layers with timeouts; includes a helper `register()` to build entries.
- Adapters (in-memory): Layer, Queue, Emitter, Event, Registry, Diagnostic, Logger.

## Public API (selected)
- Tokens: `createPortToken`, `createPortTokens`, `extendPorts`
- Container: `Container` class, `container()` global getter (with `.resolve`, `.get`, `.using`, etc.)
- Orchestrator: `Orchestrator` class, `orchestrator()` global getter (with `.start()`, `.stop()`, `.destroy()`)
- Helper: `register(token, provider, options)` for typed registrations
- Built-ins: `LayerAdapter`, `QueueAdapter`, `EmitterAdapter`, `EventAdapter`, `RegistryAdapter`, `DiagnosticAdapter`, `LoggerAdapter`

Notes
- Providers are synchronous only (no async factories or Promise values). Put async work in `Lifecycle` hooks if you build lifecycle-owning components.
- Deterministic order: dependencies are validated; start/stop/destroy run in computed layers.
- Types are strict; surfaces are small and composable.

## Contribute

A compact guide so humans and coding agents can ship high‑quality changes to @orkestrel/core with confidence.

### Principles (what we optimize for)
- Determinism: same inputs, same outputs; preserve insertion and declared dependency order
- Strong typing: strict types with zero `any`, no non‑null assertions, and honest boundaries
- Small surface: minimal, composable APIs; real use cases drive growth
- Portability: browser + Node compatible by default; in‑memory adapters in core
- Predictable lifecycles: sync providers, async work in lifecycle hooks with timeouts

### Quick workflow (how to work)
1) Edit source in `src/`
2) Mirror tests in `tests/` (one test file per source file)
3) Run locally:
    - `npm run check` — typecheck everything
    - `npm test` — run unit tests
    - `npm run format` — lint + autofix
    - `npm run build` — build types and ESM
    - `npm run docs` — generate API reference to `api/`

#### Node/browser targets
- TypeScript‑first, ESM‑only (`"type": "module"`), moduleResolution: bundler
- No Node‑only primitives in core adapters or public APIs

### Typing ethos (strict, helpful, honest)
- No `any`. No non‑null assertions (`!`). Avoid unsafe casts; prefer narrowing
- Validate at the edges: accept `unknown` from the outside world, check, then type
- Prefer `readonly` for public outputs; avoid mutating returned values
- Keep helpers small and well‑typed; document invariants where helpful
- Use provided guards from `src/helpers.ts` to narrow unions incrementally

If you must widen or coerce, write a guard instead and cover it with tests.

### TSDoc policy (what to document)
- Public exported classes and their public methods: full TSDoc
    - Include: description, `@param` and `@returns` with descriptions, an `@example`, and `@remarks` if helpful
    - Examples must use fenced code blocks with the `ts` language tag (```ts) — be consistent across the codebase
- Exported functions: full TSDoc as above
- Simple getters and setters: do not include an `@example`. Provide a concise description and a meaningful `@returns` description.
- Private methods, non‑exported classes/functions, and overload signatures: use a single‑line description comment only (no full TSDoc block)
- Types and interfaces: no TSDoc — remove banner/header or note comments on types/interfaces
- Remove header‑only banners and note style comments

Documenting options objects (important)
- TSDoc does not support dotted `@param` names (e.g., `@param opts.foo`). Using them triggers `tsdoc-param-tag-with-invalid-name`.
- For options objects, document a single parameter for the object, and list its properties in the description (or under `@remarks`).
- Do not include type annotations in JSDoc; rely on TypeScript types.

Example pattern
```ts
type ThingOptions = {
  parent?: unknown
  logger?: unknown
  diagnostic?: unknown
}

/**
 * Construct a Thing.
 *
 * @param opts - Configuration options:
 * - parent: Optional parent container to inherit providers from
 * - logger: Optional logger port for diagnostics
 * - diagnostic: Optional diagnostic port for error reporting
 */
class Thing {
  constructor(opts: ThingOptions = {}) { /* ... */ }
}
```

Consistency
- Examples should be minimal, copy‑paste friendly, and reflect real usage
- Prefer `readonly` in public shapes and return immutable views when sensible
- Use existing diagnostic codes and helpers; don’t invent new ones casually

### API and change control
- Do not expand the public API without a concrete, multi‑site use case
- Prefer tiny extensions to existing shapes over new abstractions
- Keep ports stable; evolve via narrowly scoped, additive methods with rationale

### Providers and lifecycle (core constraints)
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

### Ports + adapters
- Contracts: minimal, explicit, generic where useful; browser + Node friendly
- Adapters: in‑memory, side‑effect free on import; deterministic order
- Composition over inheritance; keep heavy logic in private helpers
- Caching: invalidate deterministically on mutation
- Use core diagnostics and isolate listener errors via `safeInvoke`

Determinism
- Respect insertion order for initial frontiers/queues; respect declared input order
- If tie‑breaking is required, make it stable and document it

### Testing conventions and QA
- Tests mirror source files: `tests/[file].test.ts`
- Use real in‑memory adapters; no mocks/fakes/spies in core tests
- Cover: success/failure/timeout, concurrency caps, ordering/determinism, aggregation
- No CI workflows in this repo — enforce the same gates locally before pushing or publishing: typecheck clean, lint clean, tests green, docs build

### Naming and tokens
- Ports live behind tokens; use `tokenDescription` for diagnostics/tracing payloads
- Prefer `createPortToken` / `createPortTokens` and `extendPorts` for stable, typed maps

### Guidance for automated agents
- Keep determinism; document any tie‑breaking
- Follow the TSDoc policy above strictly (including ```ts examples and no type/interface TSDoc)
- Omit `@example` for simple getters/setters; include only description and `@returns` unless a remark is essential
- Do not add new public APIs without a compelling multi‑site need
- Providers stay synchronous; move async into lifecycle hooks
- Ports minimal, adapters in‑memory; avoid Node‑only APIs in core
- Strict types: no `any`, no non‑null assertions; prefer `readonly` results
- Update tests alongside code; add new cases to the existing file
- Use the quick workflow commands before proposing changes
- Do not add GitHub Workflows or external CI; stick to local gates and existing npm scripts

### Documentation
- API reference is generated by TypeDoc to `api/` via `npm run docs`

### Code of Conduct
Be kind. Assume good intent. Discuss ideas, not people.

## Develop locally
```
npm run check    // typecheck
npm run format   // lint + autofix
npm test         // unit tests
npm run build    // build ESM + types
npm run docs     // generate API reference
```

## Publishing
- `prepublishOnly` runs the same gates (check, format, test, docs, build) so only `dist` is shipped.

## Issues
- https://github.com/orkestrel/core/issues
