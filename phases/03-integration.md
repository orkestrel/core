# Phase 3: Integration

> **Status:** 🔄 Active
> **Started:** 2026-01-14
> **Target:** 2026-01-25
> **Depends on:** Phase 2 (Core API) ✅ Complete

## Objective

Fix test infrastructure issues and ensure Container and Orchestrator work correctly with the new type system. The implementations already exist in `adapters/` and compile correctly - the remaining work is fixing test files.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 3.1 | Fix test file TypeScript errors in `container.test.ts` | ⏳ Pending | — |
| 3.2 | Fix test file TypeScript errors in `diagnostic.test.ts` | ⏳ Pending | — |
| 3.3 | Fix test file TypeScript errors in `orchestrator.test.ts` | ⏳ Pending | — |
| 3.4 | Fix test file TypeScript errors in `queue.test.ts` | ⏳ Pending | — |
| 3.5 | Fix test file TypeScript errors in `ports.test.ts` | ⏳ Pending | — |
| 3.6 | Ensure all tests pass | ⏳ Pending | — |
| 3.7 | Create `factories.ts` with factory functions | ⏳ Pending | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Current Focus: 3.1 Fix container.test.ts

### Known Issues

1. `assert.throws` with predicate function not matching vitest API
2. `assert.rejects` not available in vitest browser context
3. `Object is possibly 'undefined'` errors from strict null checks
4. `override` modifier missing on some class methods
5. `instance` property type mismatch

### Implementation Checklist

- [ ] Fix `assert.throws` calls to use vitest `expect().toThrow()` pattern
- [ ] Replace `assert.rejects` with `expect().rejects.toThrow()` pattern
- [ ] Add null checks or use optional chaining for undefined values
- [ ] Add `override` modifier to overridden methods
- [ ] Fix `instance` property types to match `Adapter | undefined`

## Phase Completion Criteria

All of the following must be true:

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes (including tests)
- [ ] `npm run test` passes
- [ ] PLAN.md updated to show Phase 3 complete