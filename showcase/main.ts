/**
 * Orkestrel Core Showcase
 *
 * Comprehensive demonstration of ALL features of the @orkestrel/core library.
 * Each tab showcases a specific category of functionality with interactive examples.
 */

import './styles.css'
import {
	Adapter,
	ContainerAdapter,
	OrchestratorAdapter,
	EmitterAdapter,
	EventAdapter,
	QueueAdapter,
	RegistryAdapter,
	LayerAdapter,
	LoggerAdapter,
	DiagnosticAdapter,
	FakeLogger,
	NoopLogger,
	createToken,
	createTokens,
	isString,
	isNumber,
	isBoolean,
	isFunction,
	isRecord,
	isError,
	isArray,
	isLiteral,
	isArrayOf,
	isToken,
	isAdapterProvider,
} from '../src/index.js'
import type { LifecycleState, Unsubscribe } from '../src/types.js'

// ============================================================================
// App State
// ============================================================================

interface Tab {
	id: string
	label: string
	render: () => string
	init?: () => void
}

const tabs: Tab[] = [
	{ id: 'adapter', label: 'Adapter Lifecycle', render: renderAdapterTab, init: initAdapterTab },
	{ id: 'container', label: 'Container DI', render: renderContainerTab, init: initContainerTab },
	{ id: 'orchestrator', label: 'Orchestrator', render: renderOrchestratorTab, init: initOrchestratorTab },
	{ id: 'emitter', label: 'Emitter', render: renderEmitterTab, init: initEmitterTab },
	{ id: 'eventbus', label: 'EventBus', render: renderEventBusTab, init: initEventBusTab },
	{ id: 'queue', label: 'Queue', render: renderQueueTab, init: initQueueTab },
	{ id: 'registry', label: 'Registry', render: renderRegistryTab, init: initRegistryTab },
	{ id: 'layer', label: 'Layer', render: renderLayerTab, init: initLayerTab },
	{ id: 'guards', label: 'Type Guards', render: renderGuardsTab, init: initGuardsTab },
]

let currentTab = 'adapter'

// ============================================================================
// Render Functions
// ============================================================================

function renderApp(): void {
	const app = document.getElementById('app')
	if (!app) return

	app.innerHTML = `
		<header class="header">
			<h1>@orkestrel/core Showcase</h1>
			<p>Interactive demonstrations of all library features</p>
		</header>
		<nav class="tabs">
			${tabs.map(t => `
				<button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}">
					${t.label}
				</button>
			`).join('')}
		</nav>
		<main class="content" id="tab-content">
			${tabs.find(t => t.id === currentTab)?.render() ?? ''}
		</main>
	`

	// Attach tab click handlers
	app.querySelectorAll('.tab').forEach(btn => {
		btn.addEventListener('click', () => {
			currentTab = (btn as HTMLElement).dataset.tab ?? 'adapter'
			renderApp()
			tabs.find(t => t.id === currentTab)?.init?.()
		})
	})

	// Initialize current tab
	tabs.find(t => t.id === currentTab)?.init?.()
}

// ============================================================================
// Adapter Tab
// ============================================================================

class DemoAdapter extends Adapter {
	protected override async onCreate(): Promise<void> {
		await delay(100)
		log('adapter-log', '✓ onCreate() called')
	}
	protected override async onStart(): Promise<void> {
		await delay(100)
		log('adapter-log', '✓ onStart() called')
	}
	protected override async onStop(): Promise<void> {
		await delay(100)
		log('adapter-log', '✓ onStop() called')
	}
	protected override async onDestroy(): Promise<void> {
		await delay(100)
		log('adapter-log', '✓ onDestroy() called')
	}
}

function renderAdapterTab(): string {
	return `
		<section class="demo-section">
			<h2>Adapter Lifecycle</h2>
			<p>Adapters are lifecycle-managed singleton components with hooks for create, start, stop, and destroy.</p>

			<div class="demo-card">
				<h3>State Machine</h3>
				<div class="state-machine">
					<div class="state" id="state-created">created</div>
					<div class="arrow">→</div>
					<div class="state" id="state-started">started</div>
					<div class="arrow">→</div>
					<div class="state" id="state-stopped">stopped</div>
					<div class="arrow">→</div>
					<div class="state" id="state-destroyed">destroyed</div>
				</div>
				<p class="current-state">Current: <strong id="adapter-state">-</strong></p>
			</div>

			<div class="demo-card">
				<h3>Controls</h3>
				<div class="button-group">
					<button id="btn-create" class="btn">Create</button>
					<button id="btn-start" class="btn btn-success">Start</button>
					<button id="btn-stop" class="btn btn-warning">Stop</button>
					<button id="btn-destroy" class="btn btn-danger">Destroy</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="adapter-log"></div>
				<button id="btn-clear-adapter" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let adapterUnsubscribe: Unsubscribe | null = null

function initAdapterTab(): void {
	updateAdapterState()

	// Clean up previous subscription
	adapterUnsubscribe?.()
	adapterUnsubscribe = DemoAdapter.on('transition', (state) => {
		log('adapter-log', `→ Transition to: ${state}`)
		updateAdapterState()
	})

	document.getElementById('btn-create')?.addEventListener('click', async () => {
		try {
			log('adapter-log', 'Calling DemoAdapter.create()...')
			await DemoAdapter.create()
			log('adapter-log', '✓ Create completed')
		} catch (e) {
			log('adapter-log', `✗ Error: ${(e as Error).message}`)
		}
		updateAdapterState()
	})

	document.getElementById('btn-start')?.addEventListener('click', async () => {
		try {
			log('adapter-log', 'Calling DemoAdapter.start()...')
			await DemoAdapter.start()
			log('adapter-log', '✓ Start completed')
		} catch (e) {
			log('adapter-log', `✗ Error: ${(e as Error).message}`)
		}
		updateAdapterState()
	})

	document.getElementById('btn-stop')?.addEventListener('click', async () => {
		try {
			log('adapter-log', 'Calling DemoAdapter.stop()...')
			await DemoAdapter.stop()
			log('adapter-log', '✓ Stop completed')
		} catch (e) {
			log('adapter-log', `✗ Error: ${(e as Error).message}`)
		}
		updateAdapterState()
	})

	document.getElementById('btn-destroy')?.addEventListener('click', async () => {
		try {
			log('adapter-log', 'Calling DemoAdapter.destroy()...')
			await DemoAdapter.destroy()
			log('adapter-log', '✓ Destroy completed')
		} catch (e) {
			log('adapter-log', `✗ Error: ${(e as Error).message}`)
		}
		updateAdapterState()
	})

	document.getElementById('btn-clear-adapter')?.addEventListener('click', () => {
		clearLog('adapter-log')
	})
}

function updateAdapterState(): void {
	const state = DemoAdapter.getState()
	const stateEl = document.getElementById('adapter-state')
	if (stateEl) stateEl.textContent = state

	const states: LifecycleState[] = ['created', 'started', 'stopped', 'destroyed']
	states.forEach(s => {
		const el = document.getElementById(`state-${s}`)
		if (el) {
			el.classList.toggle('active', s === state)
		}
	})
}

// ============================================================================
// Container Tab
// ============================================================================

class DatabaseAdapter extends Adapter {
	protected override async onStart(): Promise<void> { await delay(50) }
}
class CacheAdapter extends Adapter {
	protected override async onStart(): Promise<void> { await delay(50) }
}

const DbToken = createToken<DatabaseAdapter>('Database')
const CacheToken = createToken<CacheAdapter>('Cache')

function renderContainerTab(): string {
	return `
		<section class="demo-section">
			<h2>Container (Dependency Injection)</h2>
			<p>The ContainerAdapter provides minimal DI for registering and resolving Adapter classes.</p>

			<div class="demo-card">
				<h3>Token Registration</h3>
				<div class="code-block">
					<pre>const DbToken = createToken&lt;DatabaseAdapter&gt;('Database')
const CacheToken = createToken&lt;CacheAdapter&gt;('Cache')

container.register(DbToken, { adapter: DatabaseAdapter })
container.register(CacheToken, { adapter: CacheAdapter })</pre>
				</div>
				<div class="button-group">
					<button id="btn-register-db" class="btn">Register Database</button>
					<button id="btn-register-cache" class="btn">Register Cache</button>
					<button id="btn-resolve-db" class="btn btn-success">Resolve Database</button>
					<button id="btn-check-has" class="btn btn-secondary">Check has()</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Child Containers</h3>
				<div class="button-group">
					<button id="btn-create-child" class="btn">Create Child Container</button>
					<button id="btn-using-scope" class="btn btn-warning">Run using() Scope</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Lifecycle</h3>
				<div class="button-group">
					<button id="btn-container-destroy" class="btn btn-danger">Destroy Container</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="container-log"></div>
				<button id="btn-clear-container" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let demoContainer: ContainerAdapter | null = null

function initContainerTab(): void {
	demoContainer = new ContainerAdapter()
	log('container-log', '✓ Created new ContainerAdapter')

	document.getElementById('btn-register-db')?.addEventListener('click', () => {
		try {
			demoContainer?.register(DbToken, { adapter: DatabaseAdapter })
			log('container-log', '✓ Registered DatabaseAdapter under DbToken')
		} catch (e) {
			log('container-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-register-cache')?.addEventListener('click', () => {
		try {
			demoContainer?.register(CacheToken, { adapter: CacheAdapter })
			log('container-log', '✓ Registered CacheAdapter under CacheToken')
		} catch (e) {
			log('container-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-resolve-db')?.addEventListener('click', () => {
		try {
			const db = demoContainer?.resolve(DbToken)
			log('container-log', `✓ Resolved DbToken: ${db?.constructor.name}`)
		} catch (e) {
			log('container-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-check-has')?.addEventListener('click', () => {
		const hasDb = demoContainer?.has(DbToken)
		const hasCache = demoContainer?.has(CacheToken)
		log('container-log', `has(DbToken): ${hasDb}, has(CacheToken): ${hasCache}`)
	})

	document.getElementById('btn-create-child')?.addEventListener('click', () => {
		const child = demoContainer?.createChild()
		log('container-log', `✓ Created child container (inherits from parent)`)
		log('container-log', `  Child can resolve parent tokens: ${child?.has(DbToken)}`)
	})

	document.getElementById('btn-using-scope')?.addEventListener('click', async () => {
		log('container-log', 'Running container.using() scope...')
		try {
			await demoContainer?.using(async (scope) => {
				log('container-log', '  → Inside scope')
				scope.register(CacheToken, { adapter: CacheAdapter })
				log('container-log', '  → Registered in scope')
			})
			log('container-log', '✓ Scope completed and destroyed')
		} catch (e) {
			log('container-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-container-destroy')?.addEventListener('click', async () => {
		try {
			await demoContainer?.destroy()
			log('container-log', '✓ Container destroyed (all adapters stopped and destroyed)')
			demoContainer = new ContainerAdapter()
			log('container-log', '✓ Created fresh container')
		} catch (e) {
			log('container-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-clear-container')?.addEventListener('click', () => {
		clearLog('container-log')
	})
}

// ============================================================================
// Orchestrator Tab
// ============================================================================

class ConfigAdapter extends Adapter {
	protected override async onStart(): Promise<void> {
		await delay(100)
		log('orchestrator-log', '  [Config] Started')
	}
	protected override async onStop(): Promise<void> {
		await delay(50)
		log('orchestrator-log', '  [Config] Stopped')
	}
}

class DbServiceAdapter extends Adapter {
	protected override async onStart(): Promise<void> {
		await delay(150)
		log('orchestrator-log', '  [Database] Started')
	}
	protected override async onStop(): Promise<void> {
		await delay(50)
		log('orchestrator-log', '  [Database] Stopped')
	}
}

class ServerAdapter extends Adapter {
	protected override async onStart(): Promise<void> {
		await delay(100)
		log('orchestrator-log', '  [Server] Started')
	}
	protected override async onStop(): Promise<void> {
		await delay(50)
		log('orchestrator-log', '  [Server] Stopped')
	}
}

const ConfigToken = createToken<ConfigAdapter>('Config')
const DbServiceToken = createToken<DbServiceAdapter>('DbService')
const ServerAdapterToken = createToken<ServerAdapter>('Server')

function renderOrchestratorTab(): string {
	return `
		<section class="demo-section">
			<h2>Orchestrator</h2>
			<p>Coordinates lifecycle phases in topological dependency order.</p>

			<div class="demo-card">
				<h3>Dependency Graph</h3>
				<div class="graph-visual">
					<div class="node">Config</div>
					<div class="arrow-down">↓</div>
					<div class="node">Database</div>
					<div class="arrow-down">↓</div>
					<div class="node">Server</div>
				</div>
				<p>Server depends on Database, Database depends on Config</p>
			</div>

			<div class="demo-card">
				<h3>Controls</h3>
				<div class="button-group">
					<button id="btn-orch-start" class="btn btn-success">Start All</button>
					<button id="btn-orch-stop" class="btn btn-warning">Stop All</button>
					<button id="btn-orch-destroy" class="btn btn-danger">Destroy All</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="orchestrator-log"></div>
				<button id="btn-clear-orchestrator" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let demoOrchestrator: OrchestratorAdapter | null = null

function initOrchestratorTab(): void {
	const container = new ContainerAdapter()
	demoOrchestrator = new OrchestratorAdapter(container, {
		events: {
			onComponentStart: ({ token, durationMs }) => {
				log('orchestrator-log', `  ✓ ${String(token.description)} started in ${durationMs}ms`)
			},
			onComponentStop: ({ token, durationMs }) => {
				log('orchestrator-log', `  ✓ ${String(token.description)} stopped in ${durationMs}ms`)
			},
		},
	})
	log('orchestrator-log', '✓ Created OrchestratorAdapter')

	document.getElementById('btn-orch-start')?.addEventListener('click', async () => {
		try {
			log('orchestrator-log', '→ Starting in dependency order...')
			await demoOrchestrator?.start({
				[ConfigToken]: { adapter: ConfigAdapter },
				[DbServiceToken]: { adapter: DbServiceAdapter, dependencies: [ConfigToken] },
				[ServerAdapterToken]: { adapter: ServerAdapter, dependencies: [DbServiceToken] },
			})
			log('orchestrator-log', '✓ All components started')
		} catch (e) {
			log('orchestrator-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-orch-stop')?.addEventListener('click', async () => {
		try {
			log('orchestrator-log', '→ Stopping in reverse dependency order...')
			await demoOrchestrator?.stop()
			log('orchestrator-log', '✓ All components stopped')
		} catch (e) {
			log('orchestrator-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-orch-destroy')?.addEventListener('click', async () => {
		try {
			log('orchestrator-log', '→ Destroying all components...')
			await demoOrchestrator?.destroy()
			log('orchestrator-log', '✓ All components destroyed')
			// Reset
			const container = new ContainerAdapter()
			demoOrchestrator = new OrchestratorAdapter(container)
			log('orchestrator-log', '✓ Created fresh orchestrator')
		} catch (e) {
			log('orchestrator-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-clear-orchestrator')?.addEventListener('click', () => {
		clearLog('orchestrator-log')
	})
}

// ============================================================================
// Emitter Tab
// ============================================================================

type DemoEvents = {
	message: [string]
	count: [number]
	data: [{ id: string; value: number }]
}

function renderEmitterTab(): string {
	return `
		<section class="demo-section">
			<h2>Emitter (Typed Events)</h2>
			<p>Synchronous typed event emission with automatic listener isolation.</p>

			<div class="demo-card">
				<h3>Event Types</h3>
				<div class="code-block">
					<pre>type DemoEvents = {
  message: [string]
  count: [number]
  data: [{ id: string; value: number }]
}</pre>
				</div>
			</div>

			<div class="demo-card">
				<h3>Subscribe & Emit</h3>
				<div class="button-group">
					<button id="btn-subscribe-message" class="btn">Subscribe to 'message'</button>
					<button id="btn-subscribe-count" class="btn">Subscribe to 'count'</button>
					<button id="btn-unsubscribe" class="btn btn-warning">Unsubscribe All</button>
				</div>
				<div class="button-group" style="margin-top: 1rem">
					<button id="btn-emit-message" class="btn btn-success">Emit message</button>
					<button id="btn-emit-count" class="btn btn-success">Emit count</button>
					<button id="btn-emit-data" class="btn btn-success">Emit data</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="emitter-log"></div>
				<button id="btn-clear-emitter" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let demoEmitter: EmitterAdapter<DemoEvents> | null = null
const emitterUnsubs: Unsubscribe[] = []

function initEmitterTab(): void {
	demoEmitter = new EmitterAdapter<DemoEvents>()
	log('emitter-log', '✓ Created EmitterAdapter')

	document.getElementById('btn-subscribe-message')?.addEventListener('click', () => {
		const unsub = demoEmitter?.on('message', (msg) => {
			log('emitter-log', `  → Received message: "${msg}"`)
		})
		if (unsub) emitterUnsubs.push(unsub)
		log('emitter-log', '✓ Subscribed to "message" event')
	})

	document.getElementById('btn-subscribe-count')?.addEventListener('click', () => {
		const unsub = demoEmitter?.on('count', (n) => {
			log('emitter-log', `  → Received count: ${n}`)
		})
		if (unsub) emitterUnsubs.push(unsub)
		log('emitter-log', '✓ Subscribed to "count" event')
	})

	document.getElementById('btn-unsubscribe')?.addEventListener('click', () => {
		emitterUnsubs.forEach(u => u())
		emitterUnsubs.length = 0
		log('emitter-log', '✓ Unsubscribed all listeners')
	})

	document.getElementById('btn-emit-message')?.addEventListener('click', () => {
		log('emitter-log', 'Emitting message event...')
		demoEmitter?.emit('message', `Hello at ${new Date().toLocaleTimeString()}`)
	})

	document.getElementById('btn-emit-count')?.addEventListener('click', () => {
		log('emitter-log', 'Emitting count event...')
		demoEmitter?.emit('count', Math.floor(Math.random() * 100))
	})

	document.getElementById('btn-emit-data')?.addEventListener('click', () => {
		log('emitter-log', 'Emitting data event...')
		demoEmitter?.emit('data', { id: crypto.randomUUID().slice(0, 8), value: Math.random() })
	})

	document.getElementById('btn-clear-emitter')?.addEventListener('click', () => {
		clearLog('emitter-log')
	})
}

// ============================================================================
// EventBus Tab
// ============================================================================

type DemoTopics = {
	'user.created': { id: string; name: string }
	'user.deleted': { id: string }
	'order.placed': { orderId: string; total: number }
}

function renderEventBusTab(): string {
	return `
		<section class="demo-section">
			<h2>EventBus (Async Pub/Sub)</h2>
			<p>Asynchronous topic-based publish/subscribe with typed payloads.</p>

			<div class="demo-card">
				<h3>Topic Types</h3>
				<div class="code-block">
					<pre>type DemoTopics = {
  'user.created': { id: string; name: string }
  'user.deleted': { id: string }
  'order.placed': { orderId: string; total: number }
}</pre>
				</div>
			</div>

			<div class="demo-card">
				<h3>Subscribe & Publish</h3>
				<div class="button-group">
					<button id="btn-sub-user-created" class="btn">Subscribe user.created</button>
					<button id="btn-sub-order" class="btn">Subscribe order.placed</button>
					<button id="btn-list-topics" class="btn btn-secondary">List Topics</button>
				</div>
				<div class="button-group" style="margin-top: 1rem">
					<button id="btn-pub-user-created" class="btn btn-success">Publish user.created</button>
					<button id="btn-pub-order" class="btn btn-success">Publish order.placed</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="eventbus-log"></div>
				<button id="btn-clear-eventbus" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let demoBus: EventAdapter | null = null
const busUnsubs: Unsubscribe[] = []

function initEventBusTab(): void {
	demoBus = new EventAdapter({
		onError: (err, topic) => {
			log('eventbus-log', `✗ Error in ${topic}: ${(err as Error).message}`)
		},
	})
	log('eventbus-log', '✓ Created EventAdapter')

	document.getElementById('btn-sub-user-created')?.addEventListener('click', async () => {
		const unsub = await demoBus?.subscribe<DemoTopics['user.created']>('user.created', async (payload) => {
			log('eventbus-log', `  → User created: ${payload.name} (${payload.id})`)
		})
		if (unsub) busUnsubs.push(unsub)
		log('eventbus-log', '✓ Subscribed to "user.created"')
	})

	document.getElementById('btn-sub-order')?.addEventListener('click', async () => {
		const unsub = await demoBus?.subscribe<DemoTopics['order.placed']>('order.placed', async (payload) => {
			log('eventbus-log', `  → Order placed: ${payload.orderId} - $${payload.total.toFixed(2)}`)
		})
		if (unsub) busUnsubs.push(unsub)
		log('eventbus-log', '✓ Subscribed to "order.placed"')
	})

	document.getElementById('btn-list-topics')?.addEventListener('click', () => {
		const topics = demoBus?.topics() ?? []
		log('eventbus-log', `Topics with subscribers: [${topics.join(', ')}]`)
	})

	document.getElementById('btn-pub-user-created')?.addEventListener('click', async () => {
		log('eventbus-log', 'Publishing user.created...')
		await demoBus?.publish('user.created', { id: crypto.randomUUID().slice(0, 8), name: 'Alice' })
	})

	document.getElementById('btn-pub-order')?.addEventListener('click', async () => {
		log('eventbus-log', 'Publishing order.placed...')
		await demoBus?.publish('order.placed', { orderId: `ORD-${Date.now()}`, total: Math.random() * 100 })
	})

	document.getElementById('btn-clear-eventbus')?.addEventListener('click', () => {
		clearLog('eventbus-log')
	})
}

// ============================================================================
// Queue Tab
// ============================================================================

function renderQueueTab(): string {
	return `
		<section class="demo-section">
			<h2>Queue (Task Execution)</h2>
			<p>Task queue with concurrency control and timeout support.</p>

			<div class="demo-card">
				<h3>Basic Queue Operations</h3>
				<div class="button-group">
					<button id="btn-enqueue" class="btn">Enqueue Item</button>
					<button id="btn-dequeue" class="btn btn-warning">Dequeue Item</button>
					<button id="btn-queue-size" class="btn btn-secondary">Get Size</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Task Runner</h3>
				<p>Run tasks with concurrency control:</p>
				<div class="button-group">
					<button id="btn-run-tasks" class="btn btn-success">Run 5 Tasks (concurrency: 2)</button>
					<button id="btn-run-parallel" class="btn btn-success">Run All Parallel</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="queue-log"></div>
				<button id="btn-clear-queue" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let demoQueue: QueueAdapter<string> | null = null
let queueCounter = 0

function initQueueTab(): void {
	demoQueue = new QueueAdapter<string>({ capacity: 100 })
	log('queue-log', '✓ Created QueueAdapter')

	document.getElementById('btn-enqueue')?.addEventListener('click', async () => {
		const item = `task-${++queueCounter}`
		await demoQueue?.enqueue(item)
		log('queue-log', `✓ Enqueued: ${item}`)
	})

	document.getElementById('btn-dequeue')?.addEventListener('click', async () => {
		const item = await demoQueue?.dequeue()
		log('queue-log', item ? `✓ Dequeued: ${item}` : '(queue empty)')
	})

	document.getElementById('btn-queue-size')?.addEventListener('click', async () => {
		const size = await demoQueue?.size()
		log('queue-log', `Queue size: ${size}`)
	})

	document.getElementById('btn-run-tasks')?.addEventListener('click', async () => {
		log('queue-log', 'Running 5 tasks with concurrency 2...')
		const tasks = Array.from({ length: 5 }, (_, i) => async () => {
			log('queue-log', `  → Task ${i + 1} starting...`)
			await delay(200 + Math.random() * 300)
			log('queue-log', `  ✓ Task ${i + 1} completed`)
			return i + 1
		})
		const results = await demoQueue?.run(tasks, { concurrency: 2 })
		log('queue-log', `✓ All tasks completed: [${results?.join(', ')}]`)
	})

	document.getElementById('btn-run-parallel')?.addEventListener('click', async () => {
		log('queue-log', 'Running 5 tasks in parallel...')
		const tasks = Array.from({ length: 5 }, (_, i) => async () => {
			await delay(100 + Math.random() * 200)
			return `result-${i + 1}`
		})
		const start = Date.now()
		const results = await demoQueue?.run(tasks, { concurrency: 10 })
		const elapsed = Date.now() - start
		log('queue-log', `✓ Completed in ${elapsed}ms: [${results?.join(', ')}]`)
	})

	document.getElementById('btn-clear-queue')?.addEventListener('click', () => {
		clearLog('queue-log')
	})
}

// ============================================================================
// Registry Tab
// ============================================================================

function renderRegistryTab(): string {
	return `
		<section class="demo-section">
			<h2>Registry (Named Singletons)</h2>
			<p>Named singleton storage with optional locking.</p>

			<div class="demo-card">
				<h3>Operations</h3>
				<div class="button-group">
					<button id="btn-reg-set" class="btn">Set 'primary'</button>
					<button id="btn-reg-set-locked" class="btn btn-warning">Set 'locked' (locked)</button>
					<button id="btn-reg-get" class="btn btn-secondary">Get 'primary'</button>
					<button id="btn-reg-resolve" class="btn btn-secondary">Resolve 'locked'</button>
				</div>
				<div class="button-group" style="margin-top: 1rem">
					<button id="btn-reg-list" class="btn btn-secondary">List All</button>
					<button id="btn-reg-clear" class="btn btn-danger">Clear 'primary'</button>
					<button id="btn-reg-clear-locked" class="btn btn-danger">Clear 'locked' (force)</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="registry-log"></div>
				<button id="btn-clear-registry" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

let demoRegistry: RegistryAdapter<{ value: number }> | null = null

function initRegistryTab(): void {
	demoRegistry = new RegistryAdapter<{ value: number }>({ label: 'config' })
	log('registry-log', '✓ Created RegistryAdapter')

	document.getElementById('btn-reg-set')?.addEventListener('click', () => {
		const value = Math.floor(Math.random() * 100)
		demoRegistry?.set('primary', { value })
		log('registry-log', `✓ Set 'primary': { value: ${value} }`)
	})

	document.getElementById('btn-reg-set-locked')?.addEventListener('click', () => {
		try {
			const value = Math.floor(Math.random() * 100)
			demoRegistry?.set('locked', { value }, true)
			log('registry-log', `✓ Set 'locked' (locked): { value: ${value} }`)
		} catch (e) {
			log('registry-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-reg-get')?.addEventListener('click', () => {
		const item = demoRegistry?.get('primary')
		log('registry-log', item ? `Get 'primary': { value: ${item.value} }` : `Get 'primary': undefined`)
	})

	document.getElementById('btn-reg-resolve')?.addEventListener('click', () => {
		try {
			const item = demoRegistry?.resolve('locked')
			log('registry-log', `Resolve 'locked': { value: ${item?.value} }`)
		} catch (e) {
			log('registry-log', `✗ Error: ${(e as Error).message}`)
		}
	})

	document.getElementById('btn-reg-list')?.addEventListener('click', () => {
		const keys = demoRegistry?.list() ?? []
		log('registry-log', `Keys: [${keys.map(k => String(k)).join(', ')}]`)
	})

	document.getElementById('btn-reg-clear')?.addEventListener('click', () => {
		const cleared = demoRegistry?.clear('primary')
		log('registry-log', cleared ? `✓ Cleared 'primary'` : `✗ Could not clear 'primary'`)
	})

	document.getElementById('btn-reg-clear-locked')?.addEventListener('click', () => {
		const cleared = demoRegistry?.clear('locked', true)
		log('registry-log', cleared ? `✓ Force cleared 'locked'` : `✗ Could not clear 'locked'`)
	})

	document.getElementById('btn-clear-registry')?.addEventListener('click', () => {
		clearLog('registry-log')
	})
}

// ============================================================================
// Layer Tab
// ============================================================================

function renderLayerTab(): string {
	return `
		<section class="demo-section">
			<h2>Layer (Topological Sort)</h2>
			<p>Computes dependency layers using Kahn's algorithm.</p>

			<div class="demo-card">
				<h3>Example Graph</h3>
				<div class="code-block">
					<pre>A → B → D
    ↘   ↗
      C</pre>
				</div>
				<p>A has no deps, B and C depend on A, D depends on B and C</p>
			</div>

			<div class="demo-card">
				<h3>Compute Layers</h3>
				<div class="button-group">
					<button id="btn-compute-layers" class="btn btn-success">Compute Layers</button>
					<button id="btn-group-tokens" class="btn">Group [D, A, C]</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Log</h3>
				<div class="log-area" id="layer-log"></div>
				<button id="btn-clear-layer" class="btn btn-secondary">Clear Log</button>
			</div>
		</section>
	`
}

const TokenA = createToken('A')
const TokenB = createToken('B')
const TokenC = createToken('C')
const TokenD = createToken('D')

function initLayerTab(): void {
	const layer = new LayerAdapter()
	log('layer-log', '✓ Created LayerAdapter')

	document.getElementById('btn-compute-layers')?.addEventListener('click', () => {
		const nodes = [
			{ token: TokenA, dependencies: [] },
			{ token: TokenB, dependencies: [TokenA] },
			{ token: TokenC, dependencies: [TokenA] },
			{ token: TokenD, dependencies: [TokenB, TokenC] },
		]
		log('layer-log', 'Computing layers...')
		const layers = layer.compute(nodes)
		layers.forEach((l, i) => {
			const names = l.map(t => t.description ?? String(t))
			log('layer-log', `  Layer ${i}: [${names.join(', ')}]`)
		})
		log('layer-log', '✓ Layers computed')
	})

	document.getElementById('btn-group-tokens')?.addEventListener('click', () => {
		const nodes = [
			{ token: TokenA, dependencies: [] },
			{ token: TokenB, dependencies: [TokenA] },
			{ token: TokenC, dependencies: [TokenA] },
			{ token: TokenD, dependencies: [TokenB, TokenC] },
		]
		const layers = layer.compute(nodes)
		const subset = [TokenD, TokenA, TokenC]
		log('layer-log', 'Grouping [D, A, C] by layer order...')
		const grouped = layer.group(subset, layers)
		grouped.forEach((g, i) => {
			const names = g.map(t => t.description ?? String(t))
			log('layer-log', `  Group ${i}: [${names.join(', ')}]`)
		})
	})

	document.getElementById('btn-clear-layer')?.addEventListener('click', () => {
		clearLog('layer-log')
	})
}

// ============================================================================
// Type Guards Tab
// ============================================================================

function renderGuardsTab(): string {
	return `
		<section class="demo-section">
			<h2>Type Guards</h2>
			<p>Native type guards for runtime validation without external dependencies.</p>

			<div class="demo-card">
				<h3>Primitive Guards</h3>
				<div class="guard-grid">
					<div class="guard-item">
						<code>isString('hello')</code>
						<span class="guard-result" id="guard-string"></span>
					</div>
					<div class="guard-item">
						<code>isNumber(42)</code>
						<span class="guard-result" id="guard-number"></span>
					</div>
					<div class="guard-item">
						<code>isNumber(NaN)</code>
						<span class="guard-result" id="guard-nan"></span>
					</div>
					<div class="guard-item">
						<code>isBoolean(true)</code>
						<span class="guard-result" id="guard-boolean"></span>
					</div>
					<div class="guard-item">
						<code>isFunction(() => {})</code>
						<span class="guard-result" id="guard-function"></span>
					</div>
					<div class="guard-item">
						<code>isRecord({ a: 1 })</code>
						<span class="guard-result" id="guard-record"></span>
					</div>
					<div class="guard-item">
						<code>isRecord([1, 2])</code>
						<span class="guard-result" id="guard-record-array"></span>
					</div>
					<div class="guard-item">
						<code>isError(new Error())</code>
						<span class="guard-result" id="guard-error"></span>
					</div>
					<div class="guard-item">
						<code>isArray([1, 2, 3])</code>
						<span class="guard-result" id="guard-array"></span>
					</div>
				</div>
			</div>

			<div class="demo-card">
				<h3>Composite Guards</h3>
				<div class="guard-grid">
					<div class="guard-item">
						<code>isLiteral('a', 'b')('a')</code>
						<span class="guard-result" id="guard-literal"></span>
					</div>
					<div class="guard-item">
						<code>isLiteral('a', 'b')('c')</code>
						<span class="guard-result" id="guard-literal-fail"></span>
					</div>
					<div class="guard-item">
						<code>isArrayOf(isString)(['a', 'b'])</code>
						<span class="guard-result" id="guard-arrayof"></span>
					</div>
					<div class="guard-item">
						<code>isArrayOf(isString)(['a', 1])</code>
						<span class="guard-result" id="guard-arrayof-fail"></span>
					</div>
				</div>
			</div>

			<div class="demo-card">
				<h3>Token Guards</h3>
				<div class="guard-grid">
					<div class="guard-item">
						<code>isToken(Symbol('x'))</code>
						<span class="guard-result" id="guard-token"></span>
					</div>
					<div class="guard-item">
						<code>isAdapterProvider({ adapter: Adapter })</code>
						<span class="guard-result" id="guard-adapter-provider"></span>
					</div>
				</div>
			</div>

			<button id="btn-run-guards" class="btn btn-success" style="margin-top: 1rem">Run All Guards</button>
		</section>
	`
}

function initGuardsTab(): void {
	document.getElementById('btn-run-guards')?.addEventListener('click', () => {
		setGuardResult('guard-string', isString('hello'))
		setGuardResult('guard-number', isNumber(42))
		setGuardResult('guard-nan', isNumber(NaN))
		setGuardResult('guard-boolean', isBoolean(true))
		setGuardResult('guard-function', isFunction(() => {}))
		setGuardResult('guard-record', isRecord({ a: 1 }))
		setGuardResult('guard-record-array', isRecord([1, 2]))
		setGuardResult('guard-error', isError(new Error()))
		setGuardResult('guard-array', isArray([1, 2, 3]))

		const isAB = isLiteral('a', 'b')
		setGuardResult('guard-literal', isAB('a'))
		setGuardResult('guard-literal-fail', isAB('c'))

		const isStringArr = isArrayOf(isString)
		setGuardResult('guard-arrayof', isStringArr(['a', 'b']))
		setGuardResult('guard-arrayof-fail', isStringArr(['a', 1]))

		setGuardResult('guard-token', isToken(Symbol('x')))
		setGuardResult('guard-adapter-provider', isAdapterProvider({ adapter: DemoAdapter }))
	})
}

function setGuardResult(id: string, result: boolean): void {
	const el = document.getElementById(id)
	if (el) {
		el.textContent = String(result)
		el.className = `guard-result ${result ? 'true' : 'false'}`
	}
}

// ============================================================================
// Utilities
// ============================================================================

function log(logId: string, message: string): void {
	const logEl = document.getElementById(logId)
	if (logEl) {
		const time = new Date().toLocaleTimeString()
		logEl.innerHTML += `<div class="log-entry"><span class="log-time">[${time}]</span> ${escapeHtml(message)}</div>`
		logEl.scrollTop = logEl.scrollHeight
	}
}

function clearLog(logId: string): void {
	const logEl = document.getElementById(logId)
	if (logEl) logEl.innerHTML = ''
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Initialize App
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	renderApp()
})
