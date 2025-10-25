import { EmitterAdapter } from './adapters/emitter.js'
import { QueueAdapter } from './adapters/queue.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
LifecycleState, LifecycleOptions, LifecycleEventMap, LifecycleHook, EmitterPort, QueuePort, DiagnosticPort,
LoggerPort, AdapterSubclass,
} from './types.js'
import { LoggerAdapter } from './adapters/logger.js'
import { HELP, LIFECYCLE_MESSAGES, lifecycle } from './constants.js'
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
 * @internal
 */
protected static instance?: Adapter

#state: LifecycleState = 'created'
#emitInitial: boolean = true

readonly #timeouts: number
readonly #emitter: EmitterPort<LifecycleEventMap>
readonly #queue: QueuePort
readonly #logger: LoggerPort
readonly #diagnostic: DiagnosticPort

/**
 * Construct an Adapter with optional configuration.
 * 
 * Note: Direct instantiation is discouraged. Use static methods instead.
 *
 * @param opts - Configuration options
 */
constructor(opts: LifecycleOptions = {}) {
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
 */
static getInstance<T extends typeof Adapter>(this: T, opts?: LifecycleOptions): InstanceType<T> {
if (!this.instance) {
this.instance = new this(opts) as InstanceType<T>
}
return this.instance as InstanceType<T>
}

/**
 * Get the current lifecycle state of the singleton.
 */
static get state(): LifecycleState {
return this.instance?.state ?? 'created'
}

/**
 * Transition the singleton instance to 'created' state (idempotent).
 */
static async create<I extends Adapter>(this: AdapterSubclass<I>, opts?: LifecycleOptions): Promise<void> {
const instance = this.getInstance(opts)
await instance.create()
}

/**
 * Transition the singleton instance to 'started' state.
 */
static async start<I extends Adapter>(this: AdapterSubclass<I>, opts?: LifecycleOptions): Promise<void> {
const instance = this.getInstance(opts)
await instance.start()
}

/**
 * Transition the singleton instance to 'stopped' state.
 */
static async stop<I extends Adapter>(this: AdapterSubclass<I>): Promise<void> {
const instance = this.instance as I | undefined
if (!instance) {
throw new Error('Cannot stop: no instance exists. Call start() first.')
}
await instance.stop()
}

/**
 * Transition the singleton instance to 'destroyed' state and clear it.
 */
static async destroy<I extends Adapter>(this: AdapterSubclass<I>): Promise<void> {
const instance = this.instance as I | undefined
if (!instance) {
// Already destroyed or never created
return
}
await instance.destroy()
this.instance = undefined
}

/**
 * Subscribe to a lifecycle event on the singleton instance.
 */
static on<I extends Adapter, T extends keyof LifecycleEventMap & string>(
this: AdapterSubclass<I>,
evt: T,
fn: (...args: LifecycleEventMap[T]) => void,
): AdapterSubclass<I> {
const instance = this.getInstance()
instance.on(evt, fn)
return this
}

/**
 * Unsubscribe from a lifecycle event on the singleton instance.
 */
static off<I extends Adapter, T extends keyof LifecycleEventMap & string>(
this: AdapterSubclass<I>,
evt: T,
fn: (...args: LifecycleEventMap[T]) => void,
): AdapterSubclass<I> {
const instance = this.instance as I | undefined
if (instance) {
instance.off(evt, fn)
}
return this
}

/* Protected/Internal Methods - Used by static methods and accessible to Container/Orchestrator */

/**
 * @internal
 * Get the current lifecycle state.
 */
getState(): LifecycleState { 
return this.#state 
}

/**
 * @internal
 * Access the emitter port.
 */
get emitter(): EmitterPort<LifecycleEventMap> { 
return this.#emitter 
}

/**
 * @internal
 * Access the queue port.
 */
get queue(): QueuePort { 
return this.#queue 
}

/**
 * @internal
 * Access the logger port.
 */
get logger(): LoggerPort { 
return this.#logger 
}

/**
 * @internal
 * Access the diagnostic port.
 */
get diagnostics(): DiagnosticPort { 
return this.#diagnostic 
}

/**
 * @internal
 * Subscribe to a lifecycle event.
 */
on<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => void): void {
if (evt === 'transition' && this.#emitInitial) {
this.#emitInitial = false
setTimeout(() => this.#emitter.emit('transition', this.#state), 0)
}
this.#emitter.on(evt, fn)
}

/**
 * @internal
 * Unsubscribe from a lifecycle event.
 */
off<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => void): void {
this.#emitter.off(evt, fn)
}

// Internal: set state and emit transition events.
#setState(next: LifecycleState): void {
if (this.#state === next) return
this.#state = next
this.#emitter.emit('transition', next)
safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'lifecycle.transition', { state: next })
}

// Internal: run a lifecycle hook and transition atomically under a queue-imposed deadline.
async #runHook(hookName: LifecycleHook, hook: () => Promise<void> | void, from: LifecycleState, target: LifecycleState): Promise<void> {
const tasks: Array<() => Promise<void> | void> = [
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
? this.#diagnostic.help('ORK1021', { name: 'TimeoutError', message: "Hook '" + hookName + "' timed out after " + this.#timeouts + 'ms', hook: hookName, timedOut: true })
: this.#diagnostic.help('ORK1022', { name: 'HookError', message: "Hook '" + hookName + "' failed", hook: hookName })
this.#emitter.emit('error', wrapped)
const originalMessage = (err instanceof Error) ? err.message : undefined
const originalStack = (err instanceof Error) ? err.stack : undefined
safeInvoke(this.#diagnostic.error.bind(this.#diagnostic), wrapped, { scope: 'lifecycle', hook: hookName, timedOut: isTimeout, extra: { original: err, originalMessage, originalStack } })
return Promise.reject(wrapped)
}
}

/**
 * @internal
 * Create the lifecycle (idempotent no-op by default).
 */
async create(): Promise<void> {
if (this.#state !== 'created') this.#diagnostic.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: 'Invalid lifecycle transition from ' + this.#state + ' to created', helpUrl: HELP.lifecycle })
await this.#runHook('create', () => this.onCreate(), this.#state, 'created')
}

/**
 * @internal
 * Transition from 'created' or 'stopped' to 'started'.
 */
async start(): Promise<void> {
this.#validateTransition('started')
await this.#runHook('start', () => this.onStart(), this.#state, 'started')
}

/**
 * @internal
 * Transition from 'started' to 'stopped'.
 */
async stop(): Promise<void> {
this.#validateTransition('stopped')
await this.#runHook('stop', () => this.onStop(), this.#state, 'stopped')
}

/**
 * @internal
 * Transition to 'destroyed' and remove all listeners.
 */
async destroy(): Promise<void> {
this.#validateTransition('destroyed')
await this.#runHook('destroy', () => this.onDestroy(), this.#state, 'destroyed')
this.#emitter.removeAllListeners()
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

/* Protected Hook Methods - Override in subclasses */

/**
 * Optional hook called during create(); override in subclasses to add creation behavior.
 */
protected async onCreate(): Promise<void> {}

/**
 * Optional hook called during start(); override in subclasses to add startup behavior.
 */
protected async onStart(): Promise<void> {}

/**
 * Optional hook called during stop(); override in subclasses to add shutdown behavior.
 */
protected async onStop(): Promise<void> {}

/**
 * Optional hook called during destroy(); override in subclasses to add cleanup behavior.
 */
protected async onDestroy(): Promise<void> {}

/**
 * Optional hook called around each transition after the main hook has run.
 */
protected async onTransition(_from: LifecycleState, _to: LifecycleState, _hook: LifecycleHook): Promise<void> {}
}
