# Comprehensive Architectural Refactoring:  @orkestrel/core

> **Purpose:** Guide deep architectural refactoring that follows copilot-instructions. md conventions exactly, using types. ts as the single source of truth. 

---

## Project Context

| Variable | Value |
|----------|-------|
| `PROJECT_NAME` | `@orkestrel/core` |
| `CURRENT_PHASE` | `02-core-api.md` |
| `Primary Entities` | Adapter, Container, Orchestrator, Emitter, Queue, Layer, Registry, Logger, Diagnostic |

---

## Phase 1: Foundation Analysis

### 1.1 Problem Space Definition

**Core Problem:** Provide a minimal, strongly-typed adapter/port toolkit for TypeScript applications with: 
- Lifecycle-managed singleton components (Adapter pattern)
- Dependency injection with hierarchical containers
- Deterministic orchestration of component lifecycles in dependency order
- Structured diagnostics, logging, and telemetry

**Essential Concepts (Nouns/Entities):**
| Entity | Purpose |
|--------|---------|
| Adapter | Base class for lifecycle-managed singleton components |
| Container | DI container for registering and resolving adapters |
| Orchestrator | Coordinates adapter lifecycle in topological dependency order |
| Emitter | Typed synchronous event emitter |
| Queue | Task queue with concurrency control |
| Layer | Topological sort calculator (Kahn's algorithm) |
| Registry | Named singleton storage with locking |
| Logger | Structured logging port |
| Diagnostic | Error reporting, metrics, traces, telemetry |

**Essential Operations (Verbs/Actions):**
| Operation | Entity | Description |
|-----------|--------|-------------|
| `create`, `start`, `stop`, `destroy` | Adapter | Lifecycle transitions |
| `register`, `resolve`, `get`, `has` | Container | Provider registration and resolution |
| `start`, `stop`, `destroy` | Orchestrator | Coordinate lifecycle across components |
| `on`, `emit`, `removeAllListeners` | Emitter | Event subscription and emission |
| `enqueue`, `dequeue`, `run` | Queue | Task scheduling and execution |
| `compute`, `group` | Layer | Topological ordering |
| `get`, `resolve`, `set`, `clear`, `list` | Registry | Named singleton management |
| `log`, `error`, `fail`, `help`, `aggregate` | Diagnostic | Error handling and telemetry |

**Invariants:**
1. Adapters are singletons per subclass
2. Lifecycle transitions follow:  `created → started → stopped → destroyed`
3. Dependencies must be started before dependents
4. Dependents must be stopped before dependencies
5. Container destruction stops and destroys all owned adapters
6. No circular dependencies allowed

### 1.2 Pattern Mining from Current Implementation

**Current Patterns (Keep):**
- Singleton pattern for Adapter subclasses via static methods
- `#` private fields for encapsulation
- `get()` returns `T | undefined`, `resolve()` throws
- Error codes with structured diagnostic messages
- Registry pattern for named singletons
- Topological layer computation via Kahn's algorithm

**Current Anti-Patterns (Fix):**
| Anti-Pattern | Current | Should Be |
|--------------|---------|-----------|
| Interface naming | `*Port` suffix | `*Interface` suffix |
| External dependency | `@orkestrel/validator` | Native type guards |
| Subscription pattern | `on/off` methods | `on*` returning `Unsubscribe` |
| File structure | `adapters/` flat | `core/[domain]/` nested |
| Implementation naming | `*Adapter` suffix | Clean name (no suffix) |
| Factory functions | Missing | `factories.ts` |

### 1.3 Current Implementation Audit

**Technical Debt:**

| File | Issue | Impact |
|------|-------|--------|
| `types.ts` | Uses `Port` suffix for interfaces | Inconsistent with conventions |
| `helpers.ts` | Imports from `@orkestrel/validator` | External dependency violation |
| `adapter.ts` | Uses `on/off` pattern | Should return `Unsubscribe` |
| `adapters/*. ts` | `*Adapter` suffix on implementations | Conflicts with base `Adapter` class |
| `index.ts` | Correct barrel exports | Keep |
| `constants.ts` | Good error messages | Keep |

**Missing Components:**
- `src/errors.ts` — Dedicated error class hierarchy
- `src/factories.ts` — Factory functions
- `src/core/` folder structure

**What Should Be Removed:**
- `@orkestrel/validator` dependency — replace with native guards
- `*Port` suffix from interfaces
- `*Adapter` suffix from implementations
- `on/off` pattern (replace with `on*` returning cleanup)

### 1.4 Architecture Decision

**Approach:** Complete reimagining following conventions: 

1. **Rename all interfaces:** `*Port` → `*Interface`
2. **Rename all implementations:** `*Adapter` → Clean name (e.g., `ContainerAdapter` → `Container`)
3. **Keep base `Adapter` class:** Rename to `BaseAdapter` to avoid confusion
4. **Remove external dependency:** Replace `@orkestrel/validator` with native type guards
5. **Restructure files:** Move to `src/core/[domain]/` pattern
6. **Add factories. ts:** Centralize factory functions
7. **Add errors.ts:** Dedicated error class hierarchy
8. **Update subscriptions:** Return `Unsubscribe` from `on*` methods

---

## Phase 2: Types-First Refactoring

### 2.1 Interface Naming Migration

| Current Name | New Name | Type |
|--------------|----------|------|
| `LoggerPort` | `LoggerInterface` | Behavioral |
| `DiagnosticPort` | `DiagnosticInterface` | Behavioral |
| `EmitterPort` | `EmitterInterface` | Behavioral |
| `EventPort` | `EventBusInterface` | Behavioral |
| `QueuePort` | `QueueInterface` | Behavioral |
| `LayerPort` | `LayerInterface` | Behavioral |
| `RegistryPort` | `RegistryInterface` | Behavioral |
| `LifecycleOptions` | `AdapterOptions` | Data (no suffix) |
| `ContainerOptions` | `ContainerOptions` | Data (no suffix) |
| `OrchestratorOptions` | `OrchestratorOptions` | Data (no suffix) |

### 2.2 Implementation Naming Migration

| Current Name | New Name | Location |
|--------------|----------|----------|
| `Adapter` | `BaseAdapter` | `src/core/adapter/BaseAdapter.ts` |
| `ContainerAdapter` | `Container` | `src/core/container/Container.ts` |
| `OrchestratorAdapter` | `Orchestrator` | `src/core/orchestrator/Orchestrator.ts` |
| `EmitterAdapter` | `Emitter` | `src/core/emitter/Emitter.ts` |
| `EventAdapter` | `EventBus` | `src/core/event/EventBus.ts` |
| `QueueAdapter` | `Queue` | `src/core/queue/Queue.ts` |
| `LayerAdapter` | `Layer` | `src/core/layer/Layer.ts` |
| `RegistryAdapter` | `Registry` | `src/core/registry/Registry. ts` |
| `DiagnosticAdapter` | `Diagnostic` | `src/core/diagnostic/Diagnostic.ts` |
| `LoggerAdapter` | `Logger` | `src/core/logger/Logger.ts` |
| `NoopLogger` | `NoopLogger` | `src/core/logger/NoopLogger.ts` |

### 2.3 Subscription Pattern Update

**Current Pattern:**
```typescript
interface EmitterPort<EMap extends EventMap> {
	on<E extends keyof EMap & string>(event: E, fn: EmitterListener<EMap, E>): this;
	off<E extends keyof EMap & string>(event:  E, fn: EmitterListener<EMap, E>): this;
}
```

**New Pattern:**
```typescript
type Unsubscribe = () => void

interface EmitterInterface<EMap extends EventMap> {
	on<E extends keyof EMap & string>(event: E, fn: EventListener<EMap, E>): Unsubscribe;
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void;
	removeAllListeners(): void;
}
```

### 2.4 Type Extraction Protocol

All types must be in centralized files:

| What | Destination |
|------|-------------|
| All interfaces (behavioral) | `src/types.ts` |
| All type aliases | `src/types.ts` |
| All type guards | `src/helpers.ts` |
| All constants | `src/constants.ts` |
| All error classes | `src/errors.ts` |
| All factory functions | `src/factories.ts` |

---

## Phase 3: File Structure Migration

### 3.1 Current Structure
```
src/
├── adapter. ts
├── adapters/
│   ├── container.ts
│   ├── diagnostic.ts
│   ├── emitter.ts
│   ├── event.ts
│   ├── layer.ts
│   ├── logger.ts
│   ├── orchestrator.ts
│   ├── queue.ts
│   └── registry.ts
├── constants.ts
├── helpers.ts
├── index.ts
├── ports. ts
└── types.ts
```

### 3.2 Target Structure
```
src/
├── index.ts              # Barrel exports
├── types.ts              # SOURCE OF TRUTH
├── helpers.ts            # Type guards, utilities
├── constants.ts          # Error codes, messages
├── errors.ts             # Error class hierarchy
├── factories.ts          # Factory functions
└── core/
    ├── adapter/
    │   └── BaseAdapter.ts
    ├── container/
    │   └── Container.ts
    ├── orchestrator/
    │   └── Orchestrator.ts
    ├── emitter/
    │   └── Emitter. ts
    ├── event/
    │   └── EventBus.ts
    ├── queue/
    │   └── Queue.ts
    ├── layer/
    │   └── Layer.ts
    ├── registry/
    │   └── Registry.ts
    ├── logger/
    │   ├── Logger.ts
    │   ├── NoopLogger.ts
    │   └── FakeLogger.ts
    └── diagnostic/
        └── Diagnostic.ts
```

---

## Phase 4: Dependency Removal

### 4.1 Replace @orkestrel/validator

**Current imports from `@orkestrel/validator`:**
```typescript
import { isFunction, isNumber, isRecord } from '@orkestrel/validator';
import { andOf, arrayOf, isBoolean, isError, isNumber, isRecord, isString, literalOf } from '@orkestrel/validator';
```

**Native replacements in `src/helpers.ts`:**
```typescript
export function isString(x: unknown): x is string {
	return typeof x === 'string'
}

export function isNumber(x: unknown): x is number {
	return typeof x === 'number' && !Number.isNaN(x)
}

export function isBoolean(x: unknown): x is boolean {
	return typeof x === 'boolean'
}

export function isFunction(x: unknown): x is (...args: unknown[]) => unknown {
	return typeof x === 'function'
}

export function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && ! Array.isArray(x)
}

export function isError(x: unknown): x is Error {
	return x instanceof Error
}

export function isArray(x: unknown): x is readonly unknown[] {
	return Array. isArray(x)
}
```

---

## Phase 5: Symbol Preservation Protocol

**Critical symbols to preserve:**
- All error codes:  `ORK1001` through `ORK1099`
- All lifecycle states: `'created' | 'started' | 'stopped' | 'destroyed'`
- All diagnostic message keys
- All factory functions

**Never remove:**
- Unused parameters (add TODO if blocked)
- Interface methods (implement or document)
- Error codes (maintain backward compatibility)

---

## Deliverables

1. **PLAN.md** — Strategic project vision
2. **phases/01-foundation.md** — Types, helpers, constants, errors
3. **phases/02-core-api.md** — Core implementations
4. **phases/03-integration.md** — Orchestration and container
5. **phases/04-polish.md** — Docs, examples, edge cases

---

## Key Convention Reminders

1. **Interface suffix** — `*Interface` for behavioral contracts
2. **No suffix** — Data types, options, state, subscriptions
3. **Callbacks return `unknown`** — Flexibility for void and other returns
4. **ESM imports with `.js`** — Required for module resolution
5. **`#` private fields** — Runtime-enforced encapsulation
6. **Mutators return interface** — Enable method chaining
7. **`get()` returns `T | undefined`** — Optional lookup
8. **`resolve()` throws** — Required lookup

---

**This is the way.**