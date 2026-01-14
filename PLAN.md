# Project Plan: @orkestrel/core

> **Status:** Phase 3 of 4 — Integration
> **Last Updated:** 2026-01-14
> **Next Milestone:** Fix test infrastructure and complete integration testing

## Vision

@orkestrel/core is a minimal, strongly-typed adapter/port toolkit for TypeScript.  It provides lifecycle-managed singleton components, hierarchical dependency injection, and deterministic orchestration of component lifecycles in topological dependency order.  The library is zero-dependency, environment-agnostic, and follows strict TypeScript conventions for type safety and developer experience.

The goal is to enable developers to build composable, testable applications using ports and adapters architecture with predictable lifecycle management and structured error handling.

## Non-Goals

Explicit boundaries.  What we are NOT building: 

- ❌ Full-featured IoC container with decorators or reflection
- ❌ Runtime dependency injection magic
- ❌ Async provider resolution (all providers resolve synchronously)
- ❌ Class-based provider patterns beyond AdapterProvider
- ❌ Framework integration packages (React, Vue, etc.)
- ❌ Multi-instance adapter management (adapters are singletons)
- ❌ Node.js-specific features in core library

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Orchestrator                               │
│  (Coordinates lifecycle phases in topological order)           │
└─────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Container     │  │     Layer       │  │     Queue       │
│  (DI Registry)  │  │ (Topo Sort)     │  │ (Concurrency)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BaseAdapter                               │
│  (Lifecycle state machine:  created → started → stopped → destroyed)
└─────────────────────────────────────────────────────────────────┘
          │
          ├────────────────┬────────────────┬────────────────┐
          ▼                ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Logger    │  │ Diagnostic  │  │  Emitter    │  │  Registry   │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

**Core Components:**

| Component | Responsibility |
|-----------|----------------|
| **BaseAdapter** | Abstract base for lifecycle-managed singleton components |
| **Container** | Hierarchical DI container for AdapterProvider registration |
| **Orchestrator** | Coordinates start/stop/destroy in dependency order |
| **Layer** | Computes topological layers using Kahn's algorithm |
| **Queue** | Executes tasks with concurrency control and timeouts |
| **Emitter** | Typed synchronous event emission |
| **Registry** | Named singleton storage with locking |
| **Logger** | Structured logging interface |
| **Diagnostic** | Error reporting, metrics, traces, telemetry |

## Phases

| # | Phase | Status | Description |
|---|-------|--------|-------------|
| 1 | Foundation | ✅ Complete | Types, helpers, constants, errors, file structure |
| 2 | Core API | ✅ Complete | TypeScript strict mode compatibility fixes |
| 3 | Integration | 🔄 Active | Container, Orchestrator, test fixes, factories |
| 4 | Polish | ⏳ Pending | Docs, examples, edge cases, migration guide |

**Status Legend:**
- ✅ Complete
- 🔄 Active
- ⏳ Pending

## Decisions Log

### 2026-01-14: Interface Naming Convention
**Decision:** All behavioral interfaces use `*Interface` suffix (e.g., `LoggerInterface`)
**Rationale:** Distinguishes behavioral contracts from data-only types; follows copilot-instructions. md conventions
**Alternatives rejected:** Keep `*Port` suffix (inconsistent with established patterns)

### 2026-01-14: Remove External Dependency
**Decision:** Remove `@orkestrel/validator` and implement native type guards
**Rationale:** Zero-dependency policy; type guards are simple enough to implement natively
**Alternatives rejected:** Keep dependency (violates zero-dependency principle)

### 2026-01-14: Rename Base Class
**Decision:** Rename `Adapter` to `BaseAdapter` to avoid collision with implementation naming
**Rationale:** Implementations should have clean names (no suffix), but `Adapter` is a base class
**Alternatives rejected:** Use `AbstractAdapter` (too verbose); keep conflict (confusing)

### 2026-01-14: Subscription Pattern
**Decision:** All `on*` methods return `Unsubscribe` cleanup function
**Rationale:** Follows copilot-instructions.md event subscription pattern; enables cleanup composition
**Alternatives rejected:** Keep `on/off` pattern (requires storing references)

### 2026-01-14: File Structure
**Decision:** Move implementations to `src/core/[domain]/` pattern
**Rationale:** Better organization by domain; matches established repository patterns
**Alternatives rejected:** Keep flat `adapters/` (less organized)

## Open Questions

- [ ] Should `EventBus` be kept or merged with `Emitter`? (Currently async pub/sub vs sync events)
- [ ] Should global registry functions (`container()`, `orchestrator()`) be kept or removed?
- [ ] Should `ports.ts` be kept or merged into `helpers.ts`?

## Migration Path

For users upgrading from the current implementation:

1. **Interface renames:** `*Port` → `*Interface`
2. **Implementation renames:** `*Adapter` → Clean name (except `BaseAdapter`)
3. **Import paths:** `./adapters/` → `./core/[domain]/`
4. **Subscription pattern:** Store return value of `on*` for cleanup instead of calling `off`
5. **Dependency removal:** No longer need `@orkestrel/validator`

## References

- [copilot-instructions.md](/.github/copilot-instructions. md) — Coding standards
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Language reference
- [MDN Web Docs](https://developer.mozilla.org/) — API reference