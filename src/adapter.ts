import { EmitterAdapter } from './adapters/emitter.js'
import { QueueAdapter } from './adapters/queue.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
	LifecycleState, AdapterOptions, LifecycleEventMap, LifecycleHook, EmitterInterface, QueueInterface, DiagnosticInterface,
	LoggerInterface, Unsubscribe,
} from './types.js'
import { LoggerAdapter } from './adapters/logger.js'
import { HELP, LIFECYCLE_MESSAGES } from './constants.js'
import { safeInvoke } from './helpers.js'

/**
 * Abstract base class for building adapters/components with deterministic lifecycle management.
 *
 * This class uses a singleton pattern where each subclass maintains its own single instance.
 * All lifecycle operations are performed through static methods.
 *
 * States: 'created' → 'started' → 'stopped' → 'destroyed'.
 * Override protected hooks (onCreate/onStart/onStop/onDestroy/onTransition) to implement behavior.
 *
 * Static Methods (Singleton Pattern)
 * -----------------------------------
 * - getInstance(): Get or create the singleton instance for this subclass
 * - create(): Transition the singleton instance to 'created' state
 * - start(): Transition the singleton instance to 'started' state
 * - stop(): Transition the singleton instance to 'stopped' state
 * - destroy(): Transition the singleton instance to 'destroyed' state and clear it
 * - getState(): Get the current state of the singleton instance
 * - on(): Subscribe to singleton lifecycle events
 * - off(): Unsubscribe from singleton lifecycle events
 *
 * @example
 * ```ts
 * import { Adapter } from '@orkestrel/core'
 *
 * // Define a component by subclassing Adapter and overriding hooks
 * class HttpServer extends Adapter {
 *   protected async onStart() {
 *     // start server logic
 *   }
 *   protected async onStop() {
 *     // stop server logic
 *   }
 * }
 *
 * // Use static methods for singleton lifecycle management
 * await HttpServer.start()  // Creates singleton and starts it
 * console.log(HttpServer.getState())  // 'started'
 * await HttpServer.stop()   // Stops the singleton
 * await HttpServer.destroy() // Destroys and clears the singleton
 * ```
 *
 * @remarks
 * Override any of the protected hooks: onCreate, onStart, onStop, onDestroy, onTransition.
 * The singleton instance is stored per subclass, not shared across all Adapter subclasses.
 */
export abstract class Adapter {
	/**
	 * Singleton instance storage. Each subclass stores its own instance.
	 */
	static instance: Adapter | undefined

	#state: LifecycleState = 'created'
	#emitInitial = true
	readonly #unsubscribers = new Map<(...args: unknown[]) => unknown, Unsubscribe>()

	readonly #timeouts: number
	readonly #emitter: EmitterInterface<LifecycleEventMap>
	readonly #queue: QueueInterface
	readonly #logger: LoggerInterface
	readonly #diagnostic: DiagnosticInterface

	/**
 * Construct an Adapter with optional configuration.
 *
 * Note: Direct instantiation is discouraged. Use static methods instead.
 *
 * @param opts - Configuration options
 */
	constructor(opts: AdapterOptions = {}) {
		this.#timeouts = opts.timeouts ?? 5000
		this.#emitInitial = opts.emitInitial ?? true
		this.#logger = opts.logger ?? new LoggerAdapter()
		this.#diagnostic = opts.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: LIFECYCLE_MESSAGES })
		this.#emitter = opts.emitter ?? new EmitterAdapter<LifecycleEventMap>({ logger: this.#logger, diagnostic: this.#diagnostic })
		this.#queue = opts.queue ?? new QueueAdapter({ concurrency: 1, logger: this.#logger, diagnostic: this.#diagnostic })
	}

	/* Static Singleton Lifecycle Methods */

	/**
	 * Get the singleton instance for this subclass. Creates it if it doesn't exist.
	 *
	 * @param opts - Optional lifecycle configuration options
	 * @returns The singleton instance of this Adapter subclass
	 * @example
	 * ```ts
	 * const instance = HttpServer.getInstance()
	 * console.log(instance.state)  // 'created'
	 * ```
	 */
	static getInstance<T extends typeof Adapter>(this: T, opts?: AdapterOptions): InstanceType<T> {
		// TypeScript doesn't allow `new this()` on abstract classes, but at runtime
		// this method is only called on concrete subclasses.

		this.instance ??= new (Function.prototype.bind.call(this, null, opts) as new () => InstanceType<T>)()

		return this.instance as InstanceType<T>
	}

	/**
	 * Get the current lifecycle state of the singleton.
	 *
	 * @returns The current lifecycle state ('created', 'started', 'stopped', or 'destroyed')
	 * @example
	 * ```ts
	 * console.log(HttpServer.getState())  // 'created'
	 * ```
	 */
	static getState(): LifecycleState {
		return this.instance?.state ?? 'created'
	}

	/**
	 * Transition the singleton instance to 'created' state (idempotent).
	 *
	 * @param opts - Optional lifecycle configuration options
	 * @returns Promise that resolves when creation is complete
	 * @example
	 * ```ts
	 * await HttpServer.create()
	 * console.log(HttpServer.getState())  // 'created'
	 * ```
	 */
	static async create(opts?: AdapterOptions): Promise<void> {
		const instance = this.getInstance(opts)
		await instance.#create()
	}

	/**
	 * Transition the singleton instance to 'started' state.
	 *
	 * @param opts - Optional lifecycle configuration options
	 * @returns Promise that resolves when start is complete
	 * @example
	 * ```ts
	 * await HttpServer.start()
	 * console.log(HttpServer.getState())  // 'started'
	 * ```
	 */
	static async start(opts?: AdapterOptions): Promise<void> {
		const instance = this.getInstance(opts)
		await instance.#start()
	}

	/**
	 * Transition the singleton instance to 'stopped' state.
	 *
	 * @returns Promise that resolves when stop is complete
	 * @example
	 * ```ts
	 * await HttpServer.stop()
	 * console.log(HttpServer.getState())  // 'stopped'
	 * ```
	 */
	static async stop(): Promise<void> {
		if (!this.instance) {
			throw new Error('Cannot stop: no instance exists')
		}
		await this.instance.#stop()
	}

	/**
	 * Transition the singleton instance to 'destroyed' state and clear it.
	 *
	 * @returns Promise that resolves when destruction is complete
	 * @example
	 * ```ts
	 * await HttpServer.destroy()
	 * console.log(HttpServer.getState())  // 'created' (new instance on next call)
	 * ```
	 */
	static async destroy(): Promise<void> {
		if (!this.instance) return
		await this.instance.#destroy()
		this.instance = undefined
	}

	/**
	 * Subscribe to a lifecycle event on the singleton instance.
	 *
	 * @param evt - The lifecycle event name to subscribe to
	 * @param fn - The callback function to invoke when the event is emitted
	 * @returns The Adapter class for method chaining
	 * @example
	 * ```ts
	 * const unsubscribe = HttpServer.on('transition', (state) => console.log('New state:', state))
	 * // Later: unsubscribe()
	 * ```
	 */
	static on<T extends keyof LifecycleEventMap & string>(
		this: typeof Adapter,
		evt: T,
		fn: (...args: LifecycleEventMap[T]) => unknown,
	): Unsubscribe {
		const instance = this.getInstance()
		return instance.#on(evt, fn)
	}

	/**
	 * Unsubscribe from a lifecycle event on the singleton instance.
	 *
	 * @param evt - The lifecycle event name to unsubscribe from
	 * @param fn - The callback function to remove
	 * @example
	 * ```ts
	 * const handler = (state) => console.log('State:', state)
	 * const unsubscribe = HttpServer.on('transition', handler)
	 * unsubscribe() // Or manually: HttpServer.off('transition', handler)
	 * ```
	 */
	static off<T extends keyof LifecycleEventMap & string>(
		this: typeof Adapter,
		evt: T,
		fn: (...args: LifecycleEventMap[T]) => unknown,
	): void {
		if (this.instance) {
			this.instance.#off(evt, fn)
		}
	}

	/* Instance Properties and Methods */

	/**
	 * Get the current lifecycle state.
	 *
	 * @returns The current lifecycle state
	 */
	get state(): LifecycleState {
		return this.#state
	}

	/**
	 * Access the emitter.
	 *
	 * @returns The emitter instance
	 */
	get emitter(): EmitterInterface<LifecycleEventMap> {
		return this.#emitter
	}

	/**
	 * Access the queue.
	 *
	 * @returns The queue instance
	 */
	get queue(): QueueInterface {
		return this.#queue
	}

	/**
	 * Access the logger.
	 *
	 * @returns The logger instance
	 */
	get logger(): LoggerInterface {
		return this.#logger
	}

	/**
	 * Access the diagnostic.
	 *
	 * @returns The diagnostic instance
	 */
	get diagnostic(): DiagnosticInterface {
		return this.#diagnostic
	}

	/* Private Instance Methods - Used by static methods */

	// Internal: set state and emit transition events.
	#setState(next: LifecycleState): void {
		if (this.#state === next) return
		this.#state = next
		this.#emitter.emit('transition', next)
		safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'lifecycle.transition', { state: next })
	}

	// Internal: run a lifecycle hook and transition atomically under a queue-imposed deadline.
	async #runHook(hookName: LifecycleHook, hook: () => Promise<void> | void, from: LifecycleState, target: LifecycleState): Promise<void> {
		const tasks: (() => Promise<void> | void)[] = [
			() => hook(),
			() => this.onTransition(from, target, hookName),
		]
		try {
			await this.#queue.run(tasks, { deadline: this.#timeouts, concurrency: 1 })
			this.#setState(target)
			this.#emitter.emit(hookName)
			safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'lifecycle.hook', { hook: hookName, to: target })
		}
		catch (err) {
			const isTimeout = err instanceof Error && (err.message.includes('timed out') || err.message.includes('shared deadline exceeded'))
			const wrapped = isTimeout
				? this.#diagnostic.help('ORK1021', { name: 'TimeoutError', message: 'Hook \'' + hookName + '\' timed out after ' + this.#timeouts + 'ms', hook: hookName, timedOut: true })
				: this.#diagnostic.help('ORK1022', { name: 'HookError', message: 'Hook \'' + hookName + '\' failed', hook: hookName })
			this.#emitter.emit('error', wrapped)
			const originalMessage = (err instanceof Error) ? err.message : undefined
			const originalStack = (err instanceof Error) ? err.stack : undefined
			safeInvoke(this.#diagnostic.error.bind(this.#diagnostic), wrapped, { scope: 'lifecycle', hook: hookName, timedOut: isTimeout, extra: { original: err, originalMessage, originalStack } })
			return Promise.reject(wrapped)
		}
	}

	// Internal: validate state-machine transitions and throw ORK1020 on invalid edges.
	#validateTransition(target: LifecycleState): void {
		const from = this.#state
		const fail = (to: LifecycleState) => this.#diagnostic.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: 'Invalid lifecycle transition from ' + from + ' to ' + to, helpUrl: HELP.lifecycle })
		if (from === 'destroyed') fail(target)
		if (from === 'created' && target !== 'started' && target !== 'destroyed') fail(target)
		if (from === 'started' && !(target === 'stopped' || target === 'destroyed')) fail(target)
		if (from === 'stopped' && !(target === 'started' || target === 'destroyed')) fail(target)
	}

	// Internal: create lifecycle (idempotent).
	async #create(): Promise<void> {
		if (this.#state !== 'created') this.#diagnostic.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: 'Invalid lifecycle transition from ' + this.#state + ' to created', helpUrl: HELP.lifecycle })
		await this.#runHook('create', () => this.onCreate(), this.#state, 'created')
	}

	// Internal: transition to 'started'.
	async #start(): Promise<void> {
		this.#validateTransition('started')
		await this.#runHook('start', () => this.onStart(), this.#state, 'started')
	}

	// Internal: transition to 'stopped'.
	async #stop(): Promise<void> {
		this.#validateTransition('stopped')
		await this.#runHook('stop', () => this.onStop(), this.#state, 'stopped')
	}

	// Internal: transition to 'destroyed'.
	async #destroy(): Promise<void> {
		this.#validateTransition('destroyed')
		await this.#runHook('destroy', () => this.onDestroy(), this.#state, 'destroyed')
		this.#emitter.removeAllListeners()
	}

	// Internal: subscribe to lifecycle event.
	#on<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => unknown): Unsubscribe {
		if (evt === 'transition' && this.#emitInitial) {
			this.#emitInitial = false
			setTimeout(() => this.#emitter.emit('transition', this.#state), 0)
		}
		const unsubscribe = this.#emitter.on(evt, fn)
		this.#unsubscribers.set(fn, unsubscribe)
		return () => {
			this.#unsubscribers.delete(fn)
			unsubscribe()
		}
	}

	// Internal: unsubscribe from lifecycle event.
	#off<T extends keyof LifecycleEventMap & string>(_evt: T, fn: (...args: LifecycleEventMap[T]) => unknown): void {
		const unsubscribe = this.#unsubscribers.get(fn)
		if (unsubscribe) {
			this.#unsubscribers.delete(fn)
			unsubscribe()
		}
	}

	/* Protected Hook Methods - Override in subclasses */

	/**
 * Optional hook called during create(); override in subclasses to add creation behavior.
 */
	protected onCreate(): Promise<void> { return Promise.resolve() }

	/**
 * Optional hook called during start(); override in subclasses to add startup behavior.
 */
	protected onStart(): Promise<void> { return Promise.resolve() }

	/**
 * Optional hook called during stop(); override in subclasses to add shutdown behavior.
 */
	protected onStop(): Promise<void> { return Promise.resolve() }

	/**
 * Optional hook called during destroy(); override in subclasses to add cleanup behavior.
 */
	protected onDestroy(): Promise<void> { return Promise.resolve() }

	/**
 * Optional hook called around each transition after the main hook has run.
 */
	protected onTransition(_from: LifecycleState, _to: LifecycleState, _hook: LifecycleHook): Promise<void> { return Promise.resolve() }
}
