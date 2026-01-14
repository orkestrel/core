/**
 * Integration Tests: Registry and Layer
 *
 * End-to-end tests for RegistryAdapter and LayerAdapter
 * working in realistic scenarios.
 */

import { describe, test, assert } from 'vitest'
import {
	RegistryAdapter,
	LayerAdapter,
	createToken,
	NoopLogger,
} from '../../src/index.js'

const logger = new NoopLogger()

describe('Integration: Registry and Layer', () => {
	// =========================================================================
	// Registry Integration
	// =========================================================================

	test('registry manages named singleton instances', () => {
		interface DbConnection {
			host: string
			port: number
			connected: boolean
		}

		const registry = new RegistryAdapter<DbConnection>({ label: 'database', logger })

		// Register primary and replica
		registry.set('primary', { host: 'db1.example.com', port: 5432, connected: true })
		registry.set('replica', { host: 'db2.example.com', port: 5432, connected: true })

		// Retrieve connections
		const primary = registry.resolve('primary')
		const replica = registry.resolve('replica')

		assert.equal(primary.host, 'db1.example.com')
		assert.equal(replica.host, 'db2.example.com')

		// List all connections
		const keys = registry.list()
		assert.ok(keys.includes('primary'))
		assert.ok(keys.includes('replica'))
	})

	test('registry handles default values', () => {
		interface Config {
			env: string
			debug: boolean
		}

		const defaultConfig: Config = { env: 'development', debug: true }
		const registry = new RegistryAdapter<Config>({
			label: 'config',
			logger,
			default: { value: defaultConfig },
		})

		// Get default without setting anything
		const config = registry.resolve()
		assert.equal(config.env, 'development')
		assert.equal(config.debug, true)

		// Override for production
		registry.set('production', { env: 'production', debug: false })
		const prodConfig = registry.resolve('production')
		assert.equal(prodConfig.env, 'production')
		assert.equal(prodConfig.debug, false)
	})

	test('registry locking prevents accidental overwrites', () => {
		const registry = new RegistryAdapter<number>({ label: 'port', logger })

		registry.set('http', 80, true) // locked
		registry.set('https', 443)     // not locked

		// Can update unlocked entry
		registry.set('https', 8443)
		assert.equal(registry.resolve('https'), 8443)

		// Cannot update locked entry
		let error: unknown
		try {
			registry.set('http', 8080)
		} catch (e) {
			error = e
		}

		assert.ok(error)
		assert.match((error as Error).message, /locked/i)
		assert.equal(registry.resolve('http'), 80) // unchanged
	})

	test('registry clear with force bypasses lock', () => {
		const registry = new RegistryAdapter<string>({ label: 'session', logger })

		registry.set('active', 'session-123', true) // locked

		// Regular clear fails
		assert.equal(registry.clear('active'), false)
		assert.ok(registry.get('active'))

		// Force clear succeeds
		assert.equal(registry.clear('active', true), true)
		assert.equal(registry.get('active'), undefined)
	})

	test('registry supports symbol keys', () => {
		const registry = new RegistryAdapter<string>({ label: 'token', logger })
		const secret = Symbol('secret')

		registry.set(secret, 'super-secret-value')

		assert.equal(registry.resolve(secret), 'super-secret-value')
		assert.ok(registry.list().includes(secret))
	})

	// =========================================================================
	// Layer Integration
	// =========================================================================

	test('layer computes correct dependency order', () => {
		const layer = new LayerAdapter({ logger })

		const Config = createToken('Config')
		const Logger = createToken('Logger')
		const Database = createToken('Database')
		const Cache = createToken('Cache')
		const Server = createToken('Server')
		const Worker = createToken('Worker')

		const nodes = [
			{ token: Config, dependencies: [] },
			{ token: Logger, dependencies: [] },
			{ token: Database, dependencies: [Config, Logger] },
			{ token: Cache, dependencies: [Config, Logger] },
			{ token: Server, dependencies: [Database, Cache] },
			{ token: Worker, dependencies: [Database] },
		]

		const layers = layer.compute(nodes)

		// Layer 0: Config, Logger (no deps)
		assert.ok(layers[0]?.includes(Config))
		assert.ok(layers[0]?.includes(Logger))

		// Layer 1: Database, Cache (depend on layer 0)
		assert.ok(layers[1]?.includes(Database))
		assert.ok(layers[1]?.includes(Cache))

		// Layer 2: Server, Worker (depend on layer 1)
		assert.ok(layers[2]?.includes(Server))
		assert.ok(layers[2]?.includes(Worker))
	})

	test('layer detects circular dependencies', () => {
		const layer = new LayerAdapter({ logger })

		const A = createToken('A')
		const B = createToken('B')
		const C = createToken('C')

		const nodes = [
			{ token: A, dependencies: [B] },
			{ token: B, dependencies: [C] },
			{ token: C, dependencies: [A] }, // Cycle: A -> B -> C -> A
		]

		let error: unknown
		try {
			layer.compute(nodes)
		} catch (e) {
			error = e
		}

		assert.ok(error)
		assert.match((error as Error).message, /cycle/i)
	})

	test('layer groups tokens by computed order in reverse', () => {
		const layer = new LayerAdapter({ logger })

		const A = createToken('A')
		const B = createToken('B')
		const C = createToken('C')
		const D = createToken('D')

		const nodes = [
			{ token: A, dependencies: [] },
			{ token: B, dependencies: [A] },
			{ token: C, dependencies: [A] },
			{ token: D, dependencies: [B, C] },
		]

		const layers = layer.compute(nodes)

		// Group subset [D, A, C] in REVERSE layer order (for teardown)
		// D is layer 2, C is layer 1, A is layer 0
		// Result should be: [[D], [C], [A]] (highest layer first)
		const subset = [D, A, C]
		const grouped = layer.group(subset, layers)

		// D first (layer 2 - highest), C second (layer 1), A third (layer 0 - lowest)
		assert.ok(grouped[0]?.includes(D))
		assert.ok(grouped[1]?.includes(C))
		assert.ok(grouped[2]?.includes(A))
	})

	test('layer handles complex diamond dependency', () => {
		const layer = new LayerAdapter({ logger })

		//     A
		//    / \
		//   B   C
		//    \ /
		//     D
		//     |
		//     E

		const A = createToken('A')
		const B = createToken('B')
		const C = createToken('C')
		const D = createToken('D')
		const E = createToken('E')

		const nodes = [
			{ token: A, dependencies: [] },
			{ token: B, dependencies: [A] },
			{ token: C, dependencies: [A] },
			{ token: D, dependencies: [B, C] },
			{ token: E, dependencies: [D] },
		]

		const layers = layer.compute(nodes)

		assert.equal(layers.length, 4)
		assert.ok(layers[0]?.includes(A))
		assert.ok(layers[1]?.includes(B))
		assert.ok(layers[1]?.includes(C))
		assert.ok(layers[2]?.includes(D))
		assert.ok(layers[3]?.includes(E))
	})

	// =========================================================================
	// Registry + Layer Combined
	// =========================================================================

	test('registry stores computed layers for caching', () => {
		const layer = new LayerAdapter({ logger })
		const layerCache = new RegistryAdapter<readonly (readonly symbol[])[]>({
			label: 'layer-cache',
			logger,
		})

		const A = createToken('A')
		const B = createToken('B')
		const C = createToken('C')

		const nodes = [
			{ token: A, dependencies: [] },
			{ token: B, dependencies: [A] },
			{ token: C, dependencies: [B] },
		]

		// Compute and cache
		const computed = layer.compute(nodes)
		layerCache.set('app', computed)

		// Retrieve cached
		const cached = layerCache.resolve('app')
		assert.equal(cached.length, 3)
		assert.ok(cached[0]?.includes(A))
		assert.ok(cached[1]?.includes(B))
		assert.ok(cached[2]?.includes(C))
	})
})
