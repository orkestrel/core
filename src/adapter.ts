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
 * States: 'created' → 'started' → 'stopped' → 'destroyed'.
 * Override protected hooks (onCreate/onStart/onStop/onDestroy/onTransition) to implement behavior.
 * Use .on('transition' | 'create' | 'start' | 'stop' | 'destroy' | 'error') to observe lifecycle events.
 *
 * Static Methods
 * --------------
 * - create(): Factory method that creates and transitions an instance to 'created'
 * - start(): Factory method that creates an instance and transitions to 'started'
 * - stop(): Factory method that creates an instance and transitions to 'stopped'
 * - destroy(): Factory method that creates an instance and transitions to 'destroyed'
 *
 * Instance Methods
 * ----------------
 * - create(): Transition from 'created' to 'created' (idempotent)
 * - start(): Transition to 'started'
 * - stop(): Transition to 'stopped'
 * - destroy(): Transition to 'destroyed'
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
 * import { Adapter, createToken, Container } from '@orkestrel/core'
 *
 * // Define a component by subclassing Adapter and overriding hooks
 * class HttpServer extends Adapter {
 *   #server?: { listen: () => Promise<void>, close: () => Promise<void> }
 *   readonly #port: number
 *   constructor(port: number) { super(); this.#port = port }
 *   protected async onStart() {
 *     // create server; await server.listen()
 *     this.#server = undefined
 *   }
 *   protected async onStop() {
 *     // await this.#server?.close()
 *   }
 * }
 *
 * // Register and drive it via the container
 * const TOK = createToken<HttpServer>('http')
 * const container = new Container()
 * container.register(TOK, { useFactory: () => new HttpServer(3000) })
 * const srv = container.resolve(TOK)
 * await srv.start()
 * await srv.stop()
 * await container.destroy() // ensures srv is destroyed
 * ```
 *
 * @remarks
 * Override any of the protected hooks: onCreate, onStart, onStop, onDestroy, onTransition.
 */
export abstract class Adapter {
#state: LifecycleState = 'created'
#emitInitial: boolean

readonly #timeouts: number
readonly #emitter: EmitterPort<LifecycleEventMap>
readonly #queue: QueuePort
readonly #logger: LoggerPort
readonly #diagnostic: DiagnosticPort

/**
 * Construct an Adapter with optional configuration for timeouts, emitters, queue, logger, and diagnostic ports.
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

/* Static Lifecycle Methods */

/**
 * Create and return an instance in 'created' state.
 *
 * @typeParam I - The Adapter subclass instance type
 * @returns A promise resolving to the created instance
 */
static async create<I extends Adapter>(this: AdapterSubclass<I>): Promise<I> {
return this.transition<I>('created')
}

/**
 * Create an instance and transition to 'started' state.
 *
 * @typeParam I - The Adapter subclass instance type
 * @returns A promise resolving to the started instance
 */
static async start<I extends Adapter>(this: AdapterSubclass<I>): Promise<I> {
return this.transition<I>('started')
}

/**
 * Create an instance and transition to 'stopped' state.
 *
 * @typeParam I - The Adapter subclass instance type
 * @returns A promise resolving to the stopped instance
 */
static async stop<I extends Adapter>(this: AdapterSubclass<I>): Promise<I> {
return this.transition<I>('stopped')
}

/**
 * Create an instance and transition to 'destroyed' state, then return void.
 *
 * @typeParam I - The Adapter subclass instance type
 * @returns A promise resolving when the instance is destroyed
 */
static async destroy<I extends Adapter>(this: AdapterSubclass<I>): Promise<void> {
await this.transition<I>('destroyed')
}

/**
 * Generic transition method to handle state changes.
 * Creates an instance and transitions it to the target state.
 *
 * @typeParam I - The Adapter subclass instance type
 * @param to - Target lifecycle state
 * @returns A promise resolving to the instance in the target state
 */
private static async transition<I extends Adapter>(this: AdapterSubclass<I>, to: LifecycleState): Promise<I> {
const instance = new this()

// Transition through states in order until we reach the target
const states: LifecycleState[] = [...lifecycle]
const targetIdx = states.indexOf(to)
const currentIdx = states.indexOf(instance.state)

if (targetIdx < currentIdx) {
throw new Error('Cannot transition backwards from ' + instance.state + ' to ' + to)
}

// Transition through each intermediate state
for (let i = currentIdx; i <= targetIdx; i++) {
const state = states[i]
if (state === 'created' && i === currentIdx) {
// Already in created state, optionally call create()
if (i < targetIdx) continue
await instance.create()
}
else if (state === 'started') {
await instance.start()
}
else if (state === 'stopped') {
await instance.stop()
}
else if (state === 'destroyed') {
await instance.destroy()
}
}

return instance
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
 * @returns This adapter instance for chaining
 *
 * @example
 * ```ts
 * adapter.on('transition', (state) => console.log('State:', state))
 * adapter.on('error', (err) => console.error('Adapter error:', err))
 * adapter.on('start', () => console.log('Started'))
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
 * @param fn - The exact listener function to remove (must be same reference used in on)
 * @returns This adapter instance for chaining
 *
 * @example
 * ```ts
 * const handler = (state) => console.log(state)
 * adapter.on('transition', handler)
 * adapter.off('transition', handler)
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
? this.diagnostics.help('ORK1021', { name: 'TimeoutError', message: "Hook '" + hookName + "' timed out after " + this.#timeouts + 'ms', hook: hookName, timedOut: true })
: this.diagnostics.help('ORK1022', { name: 'HookError', message: "Hook '" + hookName + "' failed", hook: hookName })
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
 * await adapter.create()
 * ```
 */
async create(): Promise<void> {
if (this.#state !== 'created') this.diagnostics.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: 'Invalid lifecycle transition from ' + this.#state + ' to created', helpUrl: HELP.lifecycle })
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
 * await adapter.start()
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
 * await adapter.stop()
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
 * await adapter.destroy()
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
const fail = (to: LifecycleState) => this.diagnostics.fail('ORK1020', { scope: 'lifecycle', name: 'InvalidTransitionError', message: 'Invalid lifecycle transition from ' + from + ' to ' + to, helpUrl: HELP.lifecycle })
if (from === 'destroyed') fail(target)
if (from === 'created' && target !== 'started' && target !== 'destroyed') fail(target)
if (from === 'started' && !(target === 'stopped' || target === 'destroyed')) fail(target)
if (from === 'stopped' && !(target === 'started' || target === 'destroyed')) fail(target)
}

/* Instance Hook Methods */

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
 * 
 * @param _from - The state being transitioned from
 * @param _to - The state being transitioned to
 * @param _hook - The lifecycle hook being executed
 */
protected async onTransition(_from: LifecycleState, _to: LifecycleState, _hook: LifecycleHook): Promise<void> {}
}
