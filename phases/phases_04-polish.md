# Phase 4: Polish

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** 2026-01-28
> **Depends on:** Phase 3 (Integration) ⏳ Pending

## Objective

Polish the library with comprehensive documentation, examples, edge case handling, and migration guide. By end of phase, the library will be ready for release.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 4.1 | Complete TSDoc for all public exports | ⏳ Pending | — |
| 4.2 | Create migration guide from v1 | ⏳ Pending | — |
| 4.3 | Create usage examples | ⏳ Pending | — |
| 4.4 | Edge case tests and hardening | ⏳ Pending | — |
| 4.5 | Performance optimization review | ⏳ Pending | — |
| 4.6 | Update README.md | ⏳ Pending | — |
| 4.7 | Clean up deprecated code and TODOs | ⏳ Pending | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Current Focus: 4.1 TSDoc Documentation

### Requirements

1. Full TSDoc on all public exports
2. Description, `@param`, `@returns`, `@example` for each
3. Use `@remarks` for options object fields
4. Use `@internal` for internal-only exports
5. Examples must be copy-pasteable

### Implementation Checklist

- [ ] Document all types in `types.ts`
- [ ] Document all helpers in `helpers.ts`
- [ ] Document all factories in `factories.ts`
- [ ] Document all error classes in `errors.ts`
- [ ] Document `BaseAdapter` class
- [ ] Document `Container` class
- [ ] Document `Orchestrator` class
- [ ] Document `Emitter` class
- [ ] Document `Queue` class
- [ ] Document `Registry` class
- [ ] Document `Layer` class
- [ ] Document `Logger` and `NoopLogger`
- [ ] Document `Diagnostic` class

### Acceptance Criteria

```typescript
// All public exports must have JSDoc
// This is validated by TypeDoc generation and API review
describe('Documentation', () => {
	it.todo('all public exports have TSDoc')
	it.todo('all examples are valid TypeScript')
	it.todo('migration guide covers all breaking changes')
})
```

### Blocked By

- All previous phases

### Blocks

Nothing (final phase)

## Notes

- Use 5+ backticks for examples containing code blocks
- Follow canonical prefix taxonomy in examples
- Ensure error codes are documented in migration guide

## Phase Completion Criteria

All of the following must be true: 

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run test` passes with >80% coverage
- [ ] `npm run build` produces clean output
- [ ] No `it.todo()` remaining
- [ ] README.md is comprehensive
- [ ] Migration guide is complete
- [ ] PLAN.md shows all phases complete