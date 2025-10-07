// Lifecycle core with protected onX hook pattern
// Public methods: create, start, stop, destroy
// Extension points: onCreate, onStart, onStop, onDestroy, onTransition

import { InvalidTransitionError, LifecycleError, TimeoutError, DIAGNOSTIC_MESSAGES } from './diagnostics.js'
import { EmitterAdapter } from './adapters/emitter.js'
import { QueueAdapter } from './adapters/queue.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
	LifecycleState, LifecycleOptions, LifecycleEventMap, LifecycleHook, EmitterPort, QueuePort, DiagnosticPort,
	LoggerPort,
} from './types.js'
import { LoggerAdapter } from './adapters/logger'

export abstract class Lifecycle {
	private _state: LifecycleState = 'created'
	private readonly timeouts: number
	private emitInitial: boolean
	readonly #emitter: EmitterPort<LifecycleEventMap>
	readonly #queue: QueuePort
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	constructor(opts: LifecycleOptions = {}) {
		this.timeouts = opts.timeouts ?? 5000
		this.emitInitial = opts.emitInitial ?? true
		this.#emitter = opts.emitter ?? new EmitterAdapter<LifecycleEventMap>()
		this.#queue = opts.queue ?? new QueueAdapter({ concurrency: 1 })
		this.#logger = opts.logger ?? new LoggerAdapter()
		this.#diagnostic = opts.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: DIAGNOSTIC_MESSAGES })
	}

	get emitter(): EmitterPort<LifecycleEventMap> { return this.#emitter }
	get queue(): QueuePort { return this.#queue }
	get logger(): LoggerPort { return this.#logger }
	get diagnostics(): DiagnosticPort { return this.#diagnostic }

	get state(): LifecycleState { return this._state }
	protected setState(next: LifecycleState): void {
		// avoid emitting when state doesn't actually change
		if (this._state === next) return
		this._state = next
		this.emitter.emit('transition', next)
		// diagnostics event (guarded)
		try {
			this.diagnostics.event('lifecycle.transition', { state: next })
		}
		catch {
			// swallow
		}
	}

	on<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => void): this {
		// Schedule initial emission on first transition subscription (if enabled)
		if (evt === 'transition' && this.emitInitial) {
			this.emitInitial = false
			setTimeout(() => this.emitter.emit('transition', this._state), 0)
		}
		this.emitter.on(evt, fn)
		return this
	}

	off<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => void): this {
		this.emitter.off(evt, fn)
		return this
	}

	private async runHook(hookName: LifecycleHook, hook: () => Promise<void> | void, from: LifecycleState, target: LifecycleState): Promise<void> {
		const tasks: Array<() => Promise<void> | void> = [
			() => hook(),
			() => this.onTransition(from, target, hookName),
		]
		try {
			await this.queue.run(tasks, { deadline: this.timeouts, concurrency: 1 })
			this.setState(target)
			this.emitter.emit(hookName)
			try {
				this.diagnostics.event('lifecycle.hook', { hook: hookName, to: target })
			}
			catch {
				// swallow
			}
		}
		catch (err) {
			// Map queue timeouts/shared-deadline errors to TimeoutError; wrap others as LifecycleError
			const isTimeout = err instanceof Error && (err.message.includes('timed out') || err.message.includes('shared deadline exceeded'))
			const wrapped = isTimeout ? new TimeoutError(hookName, this.timeouts) : (err instanceof LifecycleError ? err : new LifecycleError(`Hook '${hookName}' failed`, { cause: err }))
			this.emitter.emit('error', wrapped)
			try {
				this.diagnostics.error(wrapped, { scope: 'lifecycle', hook: hookName, timedOut: isTimeout })
			}
			catch {
				// swallow
			}
			return Promise.reject(wrapped)
		}
	}

	async create(): Promise<void> {
		if (this._state !== 'created') throw new InvalidTransitionError(this._state, 'created')
		await this.runHook('create', () => this.onCreate(), this._state, 'created')
	}

	async start(): Promise<void> {
		this.validateTransition('started')
		await this.runHook('start', () => this.onStart(), this._state, 'started')
	}

	async stop(): Promise<void> {
		this.validateTransition('stopped')
		await this.runHook('stop', () => this.onStop(), this._state, 'stopped')
	}

	async destroy(): Promise<void> {
		this.validateTransition('destroyed')
		await this.runHook('destroy', () => this.onDestroy(), this._state, 'destroyed')
		this.emitter.removeAllListeners()
	}

	private validateTransition(target: LifecycleState): void {
		const from = this._state
		if (from === 'destroyed') throw new InvalidTransitionError(from, target)
		if (from === 'created' && target !== 'started' && target !== 'destroyed') throw new InvalidTransitionError(from, target)
		if (from === 'started' && !(target === 'stopped' || target === 'destroyed')) throw new InvalidTransitionError(from, target)
		if (from === 'stopped' && !(target === 'started' || target === 'destroyed')) throw new InvalidTransitionError(from, target)
	}

	// Hooks (override in subclasses)
	protected async onCreate(): Promise<void> {}
	protected async onStart(): Promise<void> {}
	protected async onStop(): Promise<void> {}
	protected async onDestroy(): Promise<void> {}
	protected async onTransition(_from: LifecycleState, _to: LifecycleState, _hook: LifecycleHook): Promise<void> {}
}
