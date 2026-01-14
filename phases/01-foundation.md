# Phase 1: Foundation

> **Status:** ✅ Complete
> **Started:** 2026-01-14
> **Completed:** 2026-01-14
> **Depends on:** None (initial phase)

## Objective

Establish the foundational types, utilities, and structure for the refactored @orkestrel/core. All types are defined in types.ts following conventions, all type guards implemented natively, and subscription pattern updated.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 1.1 | Refactor `types.ts` with Interface suffix convention | ✅ Done | — |
| 1.2 | Implement native type guards in `helpers.ts` | ✅ Done | — |
| 1.3 | Update `constants.ts` with standardized error messages | ✅ Done | — |
| 1.4 | Create `errors.ts` with error class hierarchy | ✅ Done | — |
| 1.5 | Update subscription pattern (on returns Unsubscribe) | ✅ Done | — |
| 1.6 | Update all adapters to use new interfaces | ✅ Done | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Completed Work

### 1.1 Refactor types.ts ✅

- Added `Unsubscribe` type at top of file
- Added `SubscriptionToHook` utility type
- Renamed `LoggerPort` → `LoggerInterface`
- Renamed `DiagnosticPort` → `DiagnosticInterface`
- Renamed `EmitterPort` → `EmitterInterface`
- Renamed `EventPort` → `EventBusInterface`
- Renamed `QueuePort` → `QueueInterface`
- Renamed `LayerPort` → `LayerInterface`
- Renamed `RegistryPort` → `RegistryInterface`
- Added `LifecycleSubscriptions` interface
- Updated event listener return type to `unknown`
- Updated `EventMap` to use `readonly unknown[]`
- Added `AdapterOptions` (replacing `LifecycleOptions`)
- Added `EventListener` type (replacing `EmitterListener`)

### 1.2 Native Type Guards ✅

Implemented in `helpers.ts`:
- `isString`, `isNumber`, `isBoolean`, `isFunction`
- `isRecord`, `isError`, `isArray`
- `isLiteral`, `isArrayOf`
- Updated `isLifecycleErrorDetail` and `isAggregateLifecycleError`

### 1.4 Error Classes ✅

Created `errors.ts` with:
- `OrkestrelError` - Base error class
- `NotFoundError` - For resolve() failures
- `InvalidTransitionError` - For invalid lifecycle transitions
- `TimeoutError` - For hook timeouts
- `AggregateLifecycleError` - For multiple failures
- `ContainerDestroyedError` - For destroyed container access
- `CircularDependencyError` - For dependency cycles
- `DuplicateRegistrationError` - For duplicate registrations

### 1.5 Subscription Pattern ✅

- Updated `EmitterInterface.on()` to return `Unsubscribe` instead of `this`
- Removed `EmitterInterface.off()` method - use returned unsubscribe function
- Updated `EmitterAdapter` to implement new interface
- Updated `Adapter.on()` to return `Unsubscribe`
- Added internal unsubscribe tracking via `#unsubscribers` map

### 1.6 Adapter Updates ✅

- Updated all adapter imports to use new interface names
- Updated all `implements` clauses to use `*Interface`
- Updated property types from `*Port` to `*Interface`

## Phase Completion

- [x] All deliverables marked ✅ Done
- [x] Code review passed
- [x] CodeQL security scan passed
- [x] PLAN.md updated to show Phase 1 complete