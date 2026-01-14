/**
 * Integration Tests: Full Application Lifecycle
 *
 * End-to-end tests that verify complete application scenarios
 * using Orchestrator, Container, and Adapter components together.
 */

import { describe, test, beforeEach, afterEach, assert, expect } from 'vitest'
import {
	Adapter,
	ContainerAdapter,
	OrchestratorAdapter,
	createToken,
	NoopLogger,
	isAggregateLifecycleError,
} from '../../src/index.js'

let logger: NoopLogger

describe('Integration: Full Application Lifecycle', () => {
	beforeEach(() => {
		logger = new NoopLogger()
	})

	afterEach(async () => {
		// Clean up all adapter singletons
		await ConfigService.destroy().catch(() => {})
		await DatabaseService.destroy().catch(() => {})
		await CacheService.destroy().catch(() => {})
		await HttpServer.destroy().catch(() => {})
		await WorkerService.destroy().catch(() => {})
	})

	// =========================================================================
	// Service Adapters
	// =========================================================================

	class ConfigService extends Adapter {
		static override instance: ConfigService | undefined
		config: Record<string, string> = {}

		protected override async onStart(): Promise<void> {
			this.config = {
				dbHost: 'localhost',
				dbPort: '5432',
				cacheHost: 'localhost',
				cachePort: '6379',
			}
		}
	}

	class DatabaseService extends Adapter {
		static override instance: DatabaseService | undefined
		connected = false

		protected override async onStart(): Promise<void> {
			await delay(10)
			this.connected = true
		}

		protected override async onStop(): Promise<void> {
			await delay(5)
			this.connected = false
		}
	}

	class CacheService extends Adapter {
		static override instance: CacheService | undefined
		connected = false

		protected override async onStart(): Promise<void> {
			await delay(10)
			this.connected = true
		}

		protected override async onStop(): Promise<void> {
			await delay(5)
			this.connected = false
		}
	}

	class HttpServer extends Adapter {
		static override instance: HttpServer | undefined
		listening = false
		requestCount = 0

		protected override async onStart(): Promise<void> {
			await delay(10)
			this.listening = true
		}

		protected override async onStop(): Promise<void> {
			await delay(5)
			this.listening = false
		}

		handleRequest(): void {
			if (!this.listening) throw new Error('Server not listening')
			this.requestCount++
		}
	}

	class WorkerService extends Adapter {
		static override instance: WorkerService | undefined
		processing = false
		jobsProcessed = 0

		protected override async onStart(): Promise<void> {
			this.processing = true
		}

		protected override async onStop(): Promise<void> {
			this.processing = false
		}

		processJob(): void {
			if (!this.processing) throw new Error('Worker not processing')
			this.jobsProcessed++
		}
	}

	const ConfigToken = createToken<ConfigService>('Config')
	const DatabaseToken = createToken<DatabaseService>('Database')
	const CacheToken = createToken<CacheService>('Cache')
	const ServerToken = createToken<HttpServer>('Server')
	const WorkerToken = createToken<WorkerService>('Worker')

	// =========================================================================
	// Tests
	// =========================================================================

	test('full application startup and shutdown', async () => {
		const container = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(container, { logger })

		await app.start({
			[ConfigToken]: { adapter: ConfigService },
			[DatabaseToken]: { adapter: DatabaseService, dependencies: [ConfigToken] },
			[CacheToken]: { adapter: CacheService, dependencies: [ConfigToken] },
			[ServerToken]: { adapter: HttpServer, dependencies: [DatabaseToken, CacheToken] },
			[WorkerToken]: { adapter: WorkerService, dependencies: [DatabaseToken] },
		})

		// Verify all services started
		const db = container.resolve(DatabaseToken)
		const cache = container.resolve(CacheToken)
		const server = container.resolve(ServerToken)
		const worker = container.resolve(WorkerToken)

		assert.equal(db.connected, true)
		assert.equal(cache.connected, true)
		assert.equal(server.listening, true)
		assert.equal(worker.processing, true)

		// Simulate work
		server.handleRequest()
		server.handleRequest()
		worker.processJob()

		assert.equal(server.requestCount, 2)
		assert.equal(worker.jobsProcessed, 1)

		// Graceful shutdown
		await app.destroy()

		assert.equal(db.connected, false)
		assert.equal(cache.connected, false)
		assert.equal(server.listening, false)
		assert.equal(worker.processing, false)
	})

	test('partial startup failure triggers rollback', async () => {
		class FailingService extends Adapter {
			static override instance: FailingService | undefined
			protected override async onStart(): Promise<void> {
				throw new Error('Intentional failure')
			}
		}
		const FailingToken = createToken<FailingService>('Failing')

		const container = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(container, { logger })

		let error: unknown
		try {
			await app.start({
				[ConfigToken]: { adapter: ConfigService },
				[DatabaseToken]: { adapter: DatabaseService, dependencies: [ConfigToken] },
				[FailingToken]: { adapter: FailingService, dependencies: [DatabaseToken] },
			})
		} catch (e) {
			error = e
		}

		assert.ok(error)
		if (isAggregateLifecycleError(error)) {
			assert.ok(error.details.some(d => d.error.message.includes('Hook')))
		}

		// Database should have been rolled back (stopped)
		const db = container.get(DatabaseToken)
		assert.equal(db?.connected, false)

		await app.destroy().catch(() => {})
		await FailingService.destroy().catch(() => {})
	})

	test('child container scopes work with orchestrator', async () => {
		const parentContainer = new ContainerAdapter({ logger })
		parentContainer.register(ConfigToken, { adapter: ConfigService })

		await ConfigService.start()

		await parentContainer.using(async (childScope) => {
			childScope.register(DatabaseToken, { adapter: DatabaseService })
			const db = childScope.resolve(DatabaseToken)
			await DatabaseService.start()
			assert.equal(db.connected, true)
		})

		// Child scope destroyed, but parent config still exists
		assert.ok(parentContainer.has(ConfigToken))
		await parentContainer.destroy()
	})

	test('timeout configuration prevents hanging services', async () => {
		class SlowService extends Adapter {
			static override instance: SlowService | undefined
			protected override async onStart(): Promise<void> {
				await delay(100)
			}
		}
		const SlowToken = createToken<SlowService>('Slow')

		const container = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(container, { logger })

		let error: unknown
		try {
			await app.start({
				[SlowToken]: { adapter: SlowService, timeouts: { onStart: 20 } },
			})
		} catch (e) {
			error = e
		}

		assert.ok(error)
		if (isAggregateLifecycleError(error)) {
			assert.ok(error.details.some(d => d.timedOut))
		}

		await app.destroy().catch(() => {})
		await SlowService.destroy().catch(() => {})
	})

	test('event callbacks track lifecycle progress', async () => {
		const events: string[] = []

		const container = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(container, {
			logger,
			events: {
				onComponentStart: ({ token }) => events.push(`start:${token.description}`),
				onComponentStop: ({ token }) => events.push(`stop:${token.description}`),
				onComponentDestroy: ({ token }) => events.push(`destroy:${token.description}`),
			},
		})

		await app.start({
			[ConfigToken]: { adapter: ConfigService },
			[DatabaseToken]: { adapter: DatabaseService, dependencies: [ConfigToken] },
		})

		await app.destroy()

		assert.ok(events.includes('start:Config'))
		assert.ok(events.includes('start:Database'))
		assert.ok(events.includes('stop:Database'))
		assert.ok(events.includes('stop:Config'))
		assert.ok(events.includes('destroy:Database'))
		assert.ok(events.includes('destroy:Config'))
	})

	test('tracer tracks dependency layers and phase outcomes', async () => {
		const layers: string[][] = []
		const phases: { phase: string; outcomes: { token: string; ok: boolean }[] }[] = []

		const container = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(container, {
			logger,
			tracer: {
				onLayers: ({ layers: l }) => layers.push(...l),
				onPhase: ({ phase, outcomes }) => phases.push({
					phase,
					outcomes: outcomes.map(o => ({ token: o.token, ok: o.ok })),
				}),
			},
		})

		await app.start({
			[ConfigToken]: { adapter: ConfigService },
			[DatabaseToken]: { adapter: DatabaseService, dependencies: [ConfigToken] },
			[CacheToken]: { adapter: CacheService, dependencies: [ConfigToken] },
		})

		await app.destroy()

		// Verify layers
		assert.ok(layers.some(l => l.includes('Config')))
		assert.ok(layers.some(l => l.includes('Database') || l.includes('Cache')))

		// Verify phases
		const startPhases = phases.filter(p => p.phase === 'start')
		assert.ok(startPhases.length >= 2) // At least 2 layers
		assert.ok(startPhases.every(p => p.outcomes.every(o => o.ok)))
	})

	test('multiple orchestrators can run independently', async () => {
		const container1 = new ContainerAdapter({ logger })
		const app1 = new OrchestratorAdapter(container1, { logger })

		const container2 = new ContainerAdapter({ logger })
		const app2 = new OrchestratorAdapter(container2, { logger })

		// Start app1 with Config and Database
		await app1.start({
			[ConfigToken]: { adapter: ConfigService },
		})

		// Start app2 with separate Cache (after app1)
		class CacheService2 extends Adapter {
			static override instance: CacheService2 | undefined
			ready = false
			protected override async onStart(): Promise<void> {
				this.ready = true
			}
		}
		const Cache2Token = createToken<CacheService2>('Cache2')

		await app2.start({
			[Cache2Token]: { adapter: CacheService2 },
		})

		assert.ok(container1.has(ConfigToken))
		assert.ok(!container1.has(Cache2Token))
		assert.ok(container2.has(Cache2Token))

		await app1.destroy()
		await app2.destroy()
		await CacheService2.destroy()
	})

	test('orchestrator stop and destroy flow', async () => {
		// Note: Once adapters are stopped via orchestrator.stop(),
		// they need to be manually started again or the orchestrator
		// needs to be destroyed and recreated for a full restart.
		// This is by design - orchestrator.start() only starts adapters in 'created' state.

		class RestartableDb extends Adapter {
			static override instance: RestartableDb | undefined
			connected = false

			protected override async onStart(): Promise<void> {
				await delay(10)
				this.connected = true
			}

			protected override async onStop(): Promise<void> {
				await delay(5)
				this.connected = false
			}
		}
		const RestartableDbToken = createToken<RestartableDb>('RestartableDb')

		const container = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(container, { logger })

		await app.start({
			[RestartableDbToken]: { adapter: RestartableDb },
		})

		const db = container.resolve(RestartableDbToken)
		assert.equal(db.connected, true)
		assert.equal(db.state, 'started')

		await app.stop()
		assert.equal(db.connected, false)
		assert.equal(db.state, 'stopped')

		// To restart, we need to destroy and recreate
		await app.destroy()
		assert.equal(db.state, 'destroyed')

		await RestartableDb.destroy().catch(() => {})
	})
})

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
