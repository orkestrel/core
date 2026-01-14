# Phase 3: Integration

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** 2026-01-25
> **Depends on:** Phase 2 (Core API) ⏳ Pending

## Objective

Implement Container, Orchestrator, and factory functions.  By end of phase, the library will be fully functional for dependency injection and lifecycle orchestration use cases.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 3.1 | Implement `Container` in `core/container/` | ⏳ Pending | — |
| 3.2 | Implement `Orchestrator` in `core/orchestrator/` | ⏳ Pending | — |
| 3.3 | Implement `EventBus` in `core/event/` | ⏳ Pending | — |
| 3.4 | Create `factories.ts` with all factory functions | ⏳ Pending | — |
| 3.5 | Update `index.ts` barrel exports | ⏳ Pending | — |
| 3.6 | Integration tests for Container + Orchestrator | ⏳ Pending | — |
| 3.7 | Unit tests for all above | ⏳ Pending | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Current Focus: 3.1 Container

### Requirements

1. Hierarchical DI container with parent lookup
2. Register only AdapterProvider (no other provider types)
3. `get()` returns `T | undefined`, `resolve()` throws
4. `createChild()` creates scoped container
5. `using()` runs work in auto-destroyed child scope
6. `destroy()` stops and destroys all owned adapters
7. Implements `ContainerInterface`

### Interface Contract

```typescript
export interface ContainerInterface {
	readonly diagnostic: DiagnosticInterface
	readonly logger: LoggerInterface
	register<T extends AdapterInterface>(token: Token<T>, provider: AdapterProvider<T>, lock?: boolean): this
	has<T extends AdapterInterface>(token:  Token<T>): boolean
	get<T extends AdapterInterface>(token: Token<T>): T | undefined
	resolve<T extends AdapterInterface>(token: Token<T>): T
	createChild(): ContainerInterface
	using<T>(fn: (scope: ContainerInterface) => T | Promise<T>): Promise<T>
	destroy(): Promise<void>
}
```

### Implementation Checklist

- [ ] Create `src/core/container/Container.ts`
- [ ] Implement `#registry` private Map for registrations
- [ ] Implement `#parent` for hierarchical lookup
- [ ] Implement `register()` with lock support
- [ ] Implement `has()` with parent traversal
- [ ] Implement `get()` returning undefined on miss
- [ ] Implement `resolve()` throwing on miss
- [ ] Implement `createChild()` factory
- [ ] Implement `using()` with auto-cleanup
- [ ] Implement `destroy()` with error aggregation
- [ ] Add to barrel export

### Acceptance Criteria

```typescript
describe('Container', () => {
	it('registers and resolves adapters', async () => {
		class TestAdapter extends BaseAdapter {}
		const Token = createToken<TestAdapter>('test')
		const container = createContainer()
		container.register(Token, { adapter: TestAdapter })
		const instance = container.resolve(Token)
		expect(instance).toBeInstanceOf(TestAdapter)
		await container.destroy()
	})

	it('get returns undefined for missing token', () => {
		const Token = createToken<BaseAdapter>('missing')
		const container = createContainer()
		expect(container.get(Token)).toBeUndefined()
	})

	it('resolve throws for missing token', () => {
		const Token = createToken<BaseAdapter>('missing')
		const container = createContainer()
		expect(() => container.resolve(Token)).toThrow()
	})

	it('child inherits from parent', async () => {
		class ParentAdapter extends BaseAdapter {}
		const Token = createToken<ParentAdapter>('parent')
		const parent = createContainer()
		parent.register(Token, { adapter: ParentAdapter })
		const child = parent.createChild()
		expect(child. resolve(Token)).toBe(parent. resolve(Token))
		await parent.destroy()
	})
})
```

### Blocked By

- Phase 2 (Core API implementations)

### Blocks

- 3.2 (Orchestrator) — Uses Container
- 3.4 (factories.ts) — Needs Container implementation

## Notes

- Simplify container to only support AdapterProvider (remove other provider types)
- Error codes:  ORK1005 (destroyed), ORK1006 (no provider), ORK1007 (duplicate), ORK1016 (destroy errors)
- Consider removing global `container()` getter in favor of explicit instantiation

## Phase Completion Criteria

All of the following must be true: 

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run test` passes with >80% coverage on new code
- [ ] No `it.todo()` remaining in phase scope
- [ ] PLAN.md updated to show Phase 3 complete