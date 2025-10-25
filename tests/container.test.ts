import { describe, test, beforeEach, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { createToken, Container, container, Adapter, NoopLogger, isAggregateLifecycleError } from '@orkestrel/core'

let logger: NoopLogger

class TestAdapter extends Adapter {
	static instance?: TestAdapter
	started = 0
	stopped = 0
	value = 42

	protected async onStart() { this.started++ }
	protected async onStop() { this.stopped++ }
}

class DependentAdapter extends Adapter {
	static instance?: DependentAdapter
	message = 'dependent'
}

class FailingOnDestroy extends Adapter {
	static instance?: FailingOnDestroy
	protected async onDestroy(): Promise<void> {
		throw new Error('destroy-fail')
	}
}

class AnotherFailingOnDestroy extends Adapter {
	static instance?: AnotherFailingOnDestroy
	protected async onDestroy(): Promise<void> {
		throw new Error('another-destroy-fail')
	}
}

describe('Container suite', () => {
	beforeEach(() => {
		logger = new NoopLogger()
	})
	afterEach(async () => {
		// Clean up singletons
		await TestAdapter.destroy().catch(() => {})
		await DependentAdapter.destroy().catch(() => {})
		await FailingOnDestroy.destroy().catch(() => {})
		await AnotherFailingOnDestroy.destroy().catch(() => {})
		// Clean up container registry
		for (const name of container.list()) {
			container.clear(name, true)
		}
	})

	test('adapter provider resolution', () => {
		const TOK = createToken<TestAdapter>('test')
		const c = new Container({ logger })
		c.register(TOK, { adapter: TestAdapter })
		const instance = c.resolve(TOK)
		assert.strictEqual(instance.value, 42)
		assert.equal(c.has(TOK), true)
	})

	test('strict resolve missing token throws', () => {
		const MISSING = createToken<TestAdapter>('missing:strict')
		const c = new Container({ logger })
		assert.throws(() => c.resolve(MISSING), (err: unknown) => {
			const e = err as { message?: string, code?: string }
			return typeof e?.message === 'string' && (/No provider for missing:strict/.test(e.message) || e.code === 'ORK1006')
		})
	})

	test('get returns undefined for missing token', () => {
		const MISSING = createToken<TestAdapter>('missing:get')
		const c = new Container({ logger })
		assert.equal(c.get(MISSING), undefined)
	})

	test('adapter lifecycle with container', async () => {
		const TOK = createToken<TestAdapter>('lifecycle')
		const c = new Container({ logger })
		c.register(TOK, { adapter: TestAdapter })

		const instance = c.resolve(TOK)
		assert.equal(instance.started, 0)

		await TestAdapter.start()
		assert.equal(TestAdapter.getState(), 'started')
		assert.equal(instance.started, 1)

		await c.destroy()
		assert.equal(TestAdapter.getState(), 'created') // destroy clears singleton
	})

	test('destroy aggregates errors and is idempotent', async () => {
		const A = createToken<FailingOnDestroy>('bad')
		const B = createToken<AnotherFailingOnDestroy>('bad2')
		const c = new Container({ logger })
		c.register(A, { adapter: FailingOnDestroy })
		c.register(B, { adapter: AnotherFailingOnDestroy })

		// Resolve to create instances
		c.resolve(A)
		c.resolve(B)

		// Start them so they need to be stopped
		await FailingOnDestroy.start()
		await AnotherFailingOnDestroy.start()

		// Destroy should aggregate errors
		await assert.rejects(() => c.destroy(), (err: unknown) => {
			if (isAggregateLifecycleError(err)) {
				assert.equal(err.errors.length, 2)
				// Errors are wrapped as HookError
				assert.match(err.errors[0].message, /Hook 'destroy' failed/)
				assert.match(err.errors[1].message, /Hook 'destroy' failed/)
				return true
			}
			return false
		})

		// Idempotent - second destroy is safe
		await c.destroy()
	})

	test('child container inherits providers from parent', () => {
		const TOK = createToken<TestAdapter>('inherit')
		const parent = new Container({ logger })
		parent.register(TOK, { adapter: TestAdapter })

		const child = parent.createChild()
		assert.equal(child.has(TOK), true)
		const instance = child.resolve(TOK)
		assert.strictEqual(instance.value, 42)
	})

	test('using(fn) runs in a child scope and destroys it after', async () => {
		const TOK = createToken<TestAdapter>('scoped')
		const c = new Container({ logger })

		await c.using((scope) => {
			scope.register(TOK, { adapter: TestAdapter })
			const instance = scope.resolve(TOK)
			assert.equal(instance.value, 42)
		})

		// After using, the scoped registration is gone
		assert.equal(c.has(TOK), false)
	})

	test('using(apply, fn) registers overrides in a child scope', async () => {
		class Override extends Adapter {
			static instance?: Override
			value = 100
		}

		const TOK = createToken<Adapter>('override')
		const c = new Container({ logger })
		c.register(TOK, { adapter: TestAdapter })

		await c.using(
			(scope) => {
				scope.register(TOK, { adapter: Override })
			},
			(scope) => {
				const instance = scope.resolve(TOK) as Override
				assert.equal(instance.value, 100)
			},
		)

		// Parent still has original
		const instance = c.resolve(TOK) as TestAdapter
		assert.equal(instance.value, 42)

		await Override.destroy().catch(() => {})
	})

	test('register with lock prevents re-registration', () => {
		const TOK = createToken<TestAdapter>('locked')
		const c = new Container({ logger })
		c.register(TOK, { adapter: TestAdapter }, true)

		assert.throws(() => {
			c.register(TOK, { adapter: TestAdapter })
		}, /Cannot replace locked/)
	})

	test('using(fn) resolves promised return value', async () => {
		const TOK = createToken<TestAdapter>('promised')
		const c = new Container({ logger })

		const result = await c.using(async (scope) => {
			scope.register(TOK, { adapter: TestAdapter })
			const instance = scope.resolve(TOK)
			await new Promise(r => setTimeout(r, 1))
			return instance.value
		})

		assert.equal(result, 42)
	})

	test('global container() returns default container', () => {
		const c1 = container()
		const c2 = container()
		assert.strictEqual(c1, c2)
	})

	test('global container.resolve works with adapter provider', () => {
		const TOK = createToken<TestAdapter>('global')
		container().register(TOK, { adapter: TestAdapter })
		const instance = container.resolve(TOK)
		assert.equal(instance.value, 42)
	})

	test('named containers are isolated', () => {
		const TOK = createToken<TestAdapter>('named')
		const c1 = new Container({ logger })
		const c2 = new Container({ logger })

		container.set('named1', c1)
		container.set('named2', c2)

		c1.register(TOK, { adapter: TestAdapter })

		assert.equal(container('named1').has(TOK), true)
		assert.equal(container('named2').has(TOK), false)
	})

	test('global container.using supports named containers', async () => {
		const TOK = createToken<TestAdapter>('named-using')
		const c = new Container({ logger })
		container.set('test', c)

		await container.using((scope) => {
			scope.register(TOK, { adapter: TestAdapter })
			assert.equal(scope.has(TOK), true)
		}, 'test')

		// After using, registration is gone from the child scope
		assert.equal(c.has(TOK), false)
	})
})
