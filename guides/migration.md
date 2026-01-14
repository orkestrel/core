# Migration Guide: @orkestrel/core v1 → v2

This guide covers breaking changes when upgrading from v1 to v2 of @orkestrel/core.

## Summary of Changes

| Category | v1 | v2 |
|----------|----|----|
| Interface naming | `*Port` suffix | `*Interface` suffix |
| Subscription | `on()/off()` pattern | `on()` returns `Unsubscribe` |
| Type guards | `@orkestrel/validator` | Native type guards |
| Options type | `LifecycleOptions` | `AdapterOptions` |
| Event listener | `EmitterListener` | `EventListener` |

## Interface Renames

All behavioral interfaces have been renamed from `*Port` to `*Interface`:

```typescript
// v1
import type { LoggerPort, DiagnosticPort, EmitterPort } from '@orkestrel/core'

// v2
import type { LoggerInterface, DiagnosticInterface, EmitterInterface } from '@orkestrel/core'
```

| v1 Name | v2 Name |
|---------|---------|
| `LoggerPort` | `LoggerInterface` |
| `DiagnosticPort` | `DiagnosticInterface` |
| `EmitterPort` | `EmitterInterface` |
| `EventPort` | `EventBusInterface` |
| `QueuePort` | `QueueInterface` |
| `LayerPort` | `LayerInterface` |
| `RegistryPort` | `RegistryInterface` |

## Subscription Pattern

The `on()/off()` pattern has been replaced with `on()` returning an `Unsubscribe` function:

```typescript
// v1
emitter.on('data', handler)
// Later...
emitter.off('data', handler)

// v2
const unsubscribe = emitter.on('data', handler)
// Later...
unsubscribe()
```

This applies to:
- `EmitterAdapter.on()`
- `Adapter.on()` (static and instance)
- All lifecycle event subscriptions

### Why This Change?

The new pattern:
- Eliminates the need to store handler references
- Enables easier cleanup composition
- Follows functional programming idioms
- Is consistent with modern event systems (e.g., DOM `AbortController`)

## Type Guard Migration

Remove `@orkestrel/validator` dependency and use native guards from `helpers.ts`:

```typescript
// v1
import { isString, isNumber, isFunction } from '@orkestrel/validator'

// v2
import { isString, isNumber, isFunction } from '@orkestrel/core'
```

Available native guards:
- `isString(x)` - Check if value is a string
- `isNumber(x)` - Check if value is a number (excludes NaN)
- `isBoolean(x)` - Check if value is a boolean
- `isFunction(x)` - Check if value is a function
- `isRecord(x)` - Check if value is a non-null, non-array object
- `isError(x)` - Check if value is an Error instance
- `isArray(x)` - Check if value is an array
- `isLiteral(...values)` - Create a guard for literal values
- `isArrayOf(guard)` - Create a guard for arrays of specific type

## Options Type Renames

```typescript
// v1
import type { LifecycleOptions, EmitterListener } from '@orkestrel/core'

// v2
import type { AdapterOptions, EventListener } from '@orkestrel/core'
```

| v1 Name | v2 Name |
|---------|---------|
| `LifecycleOptions` | `AdapterOptions` |
| `EmitterListener` | `EventListener` |

## Error Classes

New error classes are available in `errors.ts`:

```typescript
import {
  OrkestrelError,
  NotFoundError,
  InvalidTransitionError,
  TimeoutError,
  AggregateLifecycleError,
  ContainerDestroyedError,
  CircularDependencyError,
  DuplicateRegistrationError
} from '@orkestrel/core'
```

## Error Codes Reference

| Code | Description |
|------|-------------|
| `ORK1001` | Registry: no default instance |
| `ORK1002` | Registry: no named instance |
| `ORK1003` | Registry: cannot replace default |
| `ORK1004` | Registry: cannot replace locked |
| `ORK1005` | Container: already destroyed |
| `ORK1006` | Container: no provider for token |
| `ORK1007` | Orchestrator: duplicate registration |
| `ORK1008` | Orchestrator: unknown dependency |
| `ORK1009` | Orchestrator: cycle detected |
| `ORK1010` | Orchestrator: async useValue |
| `ORK1011` | Orchestrator: async useFactory (async function) |
| `ORK1012` | Orchestrator: async useFactory (returned Promise) |
| `ORK1013` | Orchestrator: errors during start |
| `ORK1014` | Orchestrator: errors during stop |
| `ORK1015` | Orchestrator: errors during destroyAll |
| `ORK1016` | Container: errors during destroy |
| `ORK1017` | Orchestrator: errors during destroy |
| `ORK1020` | Lifecycle: invalid transition |
| `ORK1021` | Lifecycle: hook timed out |
| `ORK1022` | Lifecycle: hook failed |
| `ORK1040` | Ports: duplicate key |
| `ORK1050` | Queue: capacity exceeded |
| `ORK1051` | Queue: aborted |
| `ORK1052` | Queue: task timed out |
| `ORK1053` | Queue: shared deadline exceeded |
| `ORK1099` | Internal invariant |

## Quick Migration Checklist

- [ ] Update all `*Port` imports to `*Interface`
- [ ] Replace `on()/off()` with `on()` + stored unsubscribe function
- [ ] Remove `@orkestrel/validator` from dependencies
- [ ] Import type guards from `@orkestrel/core`
- [ ] Update `LifecycleOptions` to `AdapterOptions`
- [ ] Update `EmitterListener` to `EventListener`
