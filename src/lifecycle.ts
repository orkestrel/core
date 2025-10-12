import { EmitterAdapter } from './adapters/emitter.js'
import { QueueAdapter } from './adapters/queue.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
	LifecycleState, LifecycleOptions, LifecycleEventMap, LifecycleHook, EmitterPort, QueuePort, DiagnosticPort,
	LoggerPort,
} from './types.js'
import { LoggerAdapter } from './adapters/logger'
import { HELP, LIFECYCLE_MESSAGES } from './constants.js'
import { safeInvoke } from './helpers.js'

/**
 * Abstract deterministic lifecycle with hook timeouts and events.
 *
 * States: 'created' → 'started' → 'stopped' → 'destroyed'.
 * Override protected hooks (onCreate/onStart/onStop/onDestroy/onTransition) to implement behavior.
 * Use .on('transition' | 'create' | 'start' | 'stop' | 'destroy' | 'error') to observe lifecycle events.
 *
 * Options
 * -------
 * - timeouts: number of milliseconds to cap each hook (default: 5000).
 * - emitInitial: when true (default), first transition listener receives the current state immediately.
 * - emitter: custom EmitterPort to receive events.
 * - queue: custom QueuePort to serialize hooks and apply deadlines.
 * - logger/diagnostic: ports used by default adapters and error reporting.
 *
 * @example
 * ```ts
 * import { Lifecycle } from '@orkestrel/core'
 *
 * class Cache extends Lifecycle {
 *   #map = new Map<string, string>()
 *   protected async onStart() { // warm up, connect, etc. }
 *   protected async onStop() { this.#map.clear() }
 * }
 *
 * const c = new Cache({ timeouts: 2000 })
 * c.on('transition', (s) => console.log('state:', s))
 * await c.start()
 * await c.stop()
 * await c.destroy()
 * ```
 */
export abstract class Lifecycle {
	#state: LifecycleState = 'created'
	#emitInitial: boolean

	readonly #timeouts: number
	readonly #emitter: EmitterPort<LifecycleEventMap>
	readonly #queue: QueuePort
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 * Construct a Lifecycle with optional configuration for timeouts, emitters, queue, logger, and diagnostic ports.
	 *
	 * @param opts - Configuration options:
	 * - timeouts: Timeout in milliseconds for each lifecycle hook (default: 5000)
	 * - emitInitial: Whether to emit the current state immediately on first transition listener (default: true)
	 * - emitter: Optional custom emitter port
	 * - queue: Optional custom queue port for serializing hooks
	 * - logger: Optional logger port
	 * - diagnostic: Optional diagnostic port for telemetry and errors
	 *
	 */
	constructor(opts: LifecycleOptions = {}) {
		this.#timeouts = opts.timeouts ?? 5000
		this.#emitInitial = opts.emitInitial ?? true
		// Initialize logger/diagnostic first so dependent adapters inherit them
		this.#logger = opts.logger ?? new LoggerAdapter()
		this.#diagnostic = opts.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: LIFECYCLE_MESSAGES })
		this.#emitter = opts.emitter ?? new EmitterAdapter<LifecycleEventMap>({ logger: this.#logger, diagnostic: this.#diagnostic })
		this.#queue = opts.queue ?? new QueueAdapter({ concurrency: 1, logger: this.#logger, diagnostic: this.#diagnostic })
	}

	/**
	 * Access the emitter port used for lifecycle events.
	 *
	 * Events include: 'transition', 'create', 'start', 'stop', 'destroy', 'error'.
	 *
	 * @returns The EmitterPort instance for lifecycle events
	 */
	get emitter(): EmitterPort<LifecycleEventMap> { return this.#emitter }

	/**
	 * Access the queue port used to serialize hooks and enforce deadlines.
	 *
	 * @returns The QueuePort instance for running lifecycle hooks
	 */
	get queue(): QueuePort { return this.#queue }

	/**
	 * Access the logger port backing this lifecycle.
	 *
	 * This logger is propagated to default adapters when not explicitly provided.
	 *
	 * @returns The LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Access the diagnostic port used for telemetry and error reporting.
	 *
	 * @returns The DiagnosticPort instance
	 */
	get diagnostics(): DiagnosticPort { return this.#diagnostic }

	/**
	 * Get the current lifecycle state.
	 *
	 * @returns The current state: 'created', 'started', 'stopped', or 'destroyed'
	 */
	get state(): LifecycleState { return this.#state }

	// Internal: set state and emit transition events.
	protected setState(next: LifecycleState): void {
		// avoid emitting when state doesn't actually change
		if (this.#state === next) return
		this.#state = next
		this.emitter.emit('transition', next)
		// diagnostics event (guarded)
		safeInvoke(this.diagnostics.event.bind(this.diagnostics), 'lifecycle.transition', { state: next })
	}

	/**
	 * Subscribe to a lifecycle event.
	 *
	 * Supported events: 'transition', 'create', 'start', 'stop', 'destroy', 'error'.
	 * The first 'transition' listener will receive the current state immediately when emitInitial is true (default).
	 *
	 * @typeParam T - Event key in the lifecycle event map
	 * @param evt - Event name to subscribe to
	 * @param fn - Listener function receiving tuple-typed arguments for the event
	 * @returns This lifecycle instance for chaining
	 *
	 * @example
	 * ```ts
	 * lifecycle.on('transition', (state) => console.log('State:', state))
	 * lifecycle.on('error', (err) => console.error('Lifecycle error:', err))
	 * lifecycle.on('start', () => console.log('Started'))
	 * ```
	 */
	on<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => void): this {
		// Schedule initial emission on first transition subscription (if enabled)
		if (evt === 'transition' && this.#emitInitial) {
			this.#emitInitial = false
			setTimeout(() => this.emitter.emit('transition', this.#state), 0)
		}
		this.emitter.on(evt, fn)
		return this
	}

	/**
	 * Unsubscribe a previously registered listener.
	 *
	 * @typeParam T - Event key in the lifecycle event map
	 * @param evt - Event name to unsubscribe from
	 * @param fn - The exact listener function to remove (must be same reference used in `on`)
	 * @returns This lifecycle instance for chaining
	 *
	 * @example
	 * ```ts
	 * const handler = (state) => console.log(state)
	 * lifecycle.on('transition', handler)
	 * lifecycle.off('transition', handler)
	 * ```
	 */
	off<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => void): this {
		this.emitter.off(evt, fn)
		return this
	}

	// Internal: run a lifecycle hook and transition atomically under a queue-imposed deadline.
	async #runHook(hookName: LifecycleHook, hook: () => Promise<void> | void, from: LifecycleState, target: LifecycleState): Promise<void> {
		const tasks: Array<() => Promise<void> | void> = [
			() => hook(),
			() => this.onTransition(from, target, hookName),
		]
		try {
			await this.queue.run(tasks, { deadline: this.#timeouts, concurrency: 1 })
			this.setState(target)
			this.emitter.emit(hookName)
			safeInvoke(this.diagnostics.event.bind(this.diagnostics), 'lifecycle.hook', { hook: hookName, to: target })
		}
		catch (err) {
			// Map queue timeouts/shared-deadline errors to a named TimeoutError-like error; pass through others
			const isTimeout = err instanceof Error && (err.message.includes('timed out') || err.message.includes('shared deadline exceeded'))
			const wrapped = isTimeout
				? this.diagnostics.help('ORK1021', { name: 'TimeoutError', message: `Hook '${hookName}' timed out after ${this.#timeouts}ms`, hook: hookName, timedOut: true })
				: this.diagnostics.help('ORK1022', { name: 'HookError', message: `Hook '${hookName}' failed`, hook: hookName })
			this.emitter.emit('error', wrapped)
			const originalMessage = (err instanceof Error) ? err.message : undefined
			const originalStack = (err instanceof Error) ? err.stack : undefined
			safeInvoke(this.diagnostics.error.bind(this.diagnostics), wrapped, { scope: 'lifecycle', hook: hookName, timedOut: isTimeout, extra: { original: err, originalMessage, originalStack } })
			return Promise.reject(wrapped)
		}
	}

	/**
	 * Create the lifecycle (idempotent no-op by default).
	 *
	 * May be called before start in complex setups. Override onCreate() to add creation behavior.
	 *
	 * @throws Error with code ORK1020 if the current state is not 'created'
	 *
	 * @example
	 * ```ts
	 * await lifecycle.create()
	 * ```
	 */
	async create(): Promise<void> {
		if (this.#state !== 'created') this.diagnostics.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: `Invalid lifecycle transition from ${this.#state} to created`, helpUrl: HELP.lifecycle })
		await this.#runHook('create', () => this.onCreate(), this.#state, 'created')
	}

	/**
	 * Transition from 'created' or 'stopped' to 'started'.
	 *
	 * Invokes the onStart hook and emits 'start' and 'transition' events on success.
	 *
	 * @throws Error with code ORK1020 if the transition is invalid
	 * @throws Error with code ORK1021 if the hook times out
	 * @throws Error with code ORK1022 if the hook throws an error
	 *
	 * @example
	 * ```ts
	 * await lifecycle.start()
	 * ```
	 */
	async start(): Promise<void> {
		this.#validateTransition('started')
		await this.#runHook('start', () => this.onStart(), this.#state, 'started')
	}

	/**
	 * Transition from 'started' to 'stopped'.
	 *
	 * Invokes the onStop hook and emits 'stop' and 'transition' events on success.
	 *
	 * @throws Error with code ORK1020 if the transition is invalid (e.g., not currently 'started')
	 * @throws Error with code ORK1021 if the hook times out
	 * @throws Error with code ORK1022 if the hook throws an error
	 *
	 * @example
	 * ```ts
	 * await lifecycle.stop()
	 * ```
	 */
	async stop(): Promise<void> {
		this.#validateTransition('stopped')
		await this.#runHook('stop', () => this.onStop(), this.#state, 'stopped')
	}

	/**
	 * Transition to 'destroyed' and remove all listeners.
	 *
	 * Safe to call multiple times (idempotent). Invokes the onDestroy hook and removes all event listeners.
	 *
	 * @throws Error with code ORK1021 if the hook times out
	 * @throws Error with code ORK1022 if the hook throws an error
	 *
	 * @example
	 * ```ts
	 * await lifecycle.destroy()
	 * ```
	 */
	async destroy(): Promise<void> {
		this.#validateTransition('destroyed')
		await this.#runHook('destroy', () => this.onDestroy(), this.#state, 'destroyed')
		this.emitter.removeAllListeners()
	}

	// Internal: validate state-machine transitions and throw ORK1020 on invalid edges.
	#validateTransition(target: LifecycleState): void {
		const from = this.#state
		const fail = (to: LifecycleState) => this.diagnostics.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: `Invalid lifecycle transition from ${from} to ${to}`, helpUrl: HELP.lifecycle })
		if (from === 'destroyed') fail(target)
		if (from === 'created' && target !== 'started' && target !== 'destroyed') fail(target)
		if (from === 'started' && !(target === 'stopped' || target === 'destroyed')) fail(target)
		if (from === 'stopped' && !(target === 'started' || target === 'destroyed')) fail(target)
	}

	// Optional hook called during create(); override in subclasses to add creation behavior.
	protected async onCreate(): Promise<void> {}

	// Optional hook called during start(); override in subclasses to add startup behavior.
	protected async onStart(): Promise<void> {}

	// Optional hook called during stop(); override in subclasses to add shutdown behavior.
	protected async onStop(): Promise<void> {}

	// Optional hook called during destroy(); override in subclasses to add cleanup behavior.
	protected async onDestroy(): Promise<void> {}

	// Optional hook called around each transition after the main hook has run.
	protected async onTransition(_from: LifecycleState, _to: LifecycleState, _hook: LifecycleHook): Promise<void> {}
}
