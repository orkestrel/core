# Phase 2: Core API

> **Status:** ✅ Complete
> **Started:** 2026-01-14
> **Completed:** 2026-01-14
> **Depends on:** Phase 1 (Foundation) ✅ Complete

## Objective

Fix TypeScript strict mode compatibility and ensure all core adapter classes work with the new conventions. The implementations already exist in `adapters/` and work correctly after Phase 1's type system updates.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 2.1 | Fix `exactOptionalPropertyTypes` issues in `adapter.ts` | ✅ Done | — |
| 2.2 | Fix `exactOptionalPropertyTypes` issues in `adapters/container.ts` | ✅ Done | — |
| 2.3 | Fix `exactOptionalPropertyTypes` issues in `adapters/diagnostic.ts` | ✅ Done | — |
| 2.4 | Fix `exactOptionalPropertyTypes` issues in `adapters/event.ts` | ✅ Done | — |
| 2.5 | Fix `exactOptionalPropertyTypes` issues in `adapters/layer.ts` | ✅ Done | — |
| 2.6 | Fix `exactOptionalPropertyTypes` issues in `adapters/logger.ts` | ✅ Done | — |
| 2.7 | Fix `exactOptionalPropertyTypes` issues in `adapters/orchestrator.ts` | ✅ Done | — |
| 2.8 | Fix `exactOptionalPropertyTypes` issues in `adapters/queue.ts` | ✅ Done | — |
| 2.9 | Fix `exactOptionalPropertyTypes` issues in `errors.ts` | ✅ Done | — |
| 2.10 | Fix `exactOptionalPropertyTypes` issues in `types.ts` | ✅ Done | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Completed Work

### TypeScript Strict Mode Fixes
All source files now compile cleanly with `exactOptionalPropertyTypes` enabled:

- Changed optional properties from `prop?: T` to `prop: T | undefined` where needed
- Fixed object construction to avoid assigning `undefined` to optional properties
- Added array bounds checking for strict indexed access
- Fixed readonly/mutable array type compatibility
- Renamed `AggregateLifecycleError` type to `AggregateLifecycleErrorLike` to avoid export conflict

### Files Modified
- `adapter.ts` - `instance` type changed to `Adapter | undefined`
- `adapters/container.ts` - `#parent` type changed to explicit union
- `adapters/diagnostic.ts` - Fixed MessageMapEntry construction, error building
- `adapters/event.ts` - `#onError` type changed to explicit union
- `adapters/layer.ts` - Added array bounds checking
- `adapters/logger.ts` - Fixed FakeLogger entry construction with helper method
- `adapters/orchestrator.ts` - Fixed multiple array access patterns, readonly types
- `adapters/queue.ts` - Fixed defaults type and options spreading
- `errors.ts` - Changed optional properties to explicit union types
- `types.ts` - Fixed `AdapterSubclass.instance` type
- `helpers.ts` - Renamed type to `AggregateLifecycleErrorLike`

## Phase Completion

- [x] All deliverables marked ✅ Done
- [x] `npm run check` passes for source files
- [x] Code review passed
- [x] CodeQL security scan passed
- [x] PLAN.md updated to show Phase 2 complete

**Note**: Test file TypeScript errors are pre-existing issues with vitest browser context and assertion patterns - unrelated to this refactoring work.