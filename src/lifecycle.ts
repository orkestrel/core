// Lifecycle core with protected onX hook pattern
// Public methods: create, start, stop, destroy
// Extension points: onCreate, onStart, onStop, onDestroy, onTransition

import { InvalidTransitionError, LifecycleError, TimeoutError } from './diagnostics.js'
import { EmitterAdapter } from './adapters/emitter.js'
import { QueueAdapter } from './adapters/queue.js'
import type { LifecycleState, LifecycleOptions, LifecycleEventMap, LifecycleHook, EmitterPort } from './types.js'

export abstract class Lifecycle {
	private _state: LifecycleState = 'created'
	private readonly timeouts: number
	private emitInitial: boolean
	readonly #emitter: EmitterPort<LifecycleEventMap>

	constructor(opts: LifecycleOptions = {}) {
		this.timeouts = opts.timeouts ?? 5000
		this.emitInitial = opts.emitInitial ?? true
		this.#emitter = opts.emitter ?? new EmitterAdapter<LifecycleEventMap>()
	}

	// Observability port getters (emitter only)
	public get emitter(): EmitterPort<LifecycleEventMap> { return this.#emitter }

	get state(): LifecycleState { return this._state }
	protected setState(next: LifecycleState): void {
		// avoid emitting when state doesn't actually change
		if (this._state === next) return
		this._state = next
		this.emitter.emit('transition', next)
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

	private validateTransition(target: LifecycleState): void {
		const from = this._state
		if (from === 'destroyed') throw new InvalidTransitionError(from, target)
		if (from === 'created' && target !== 'started' && target !== 'destroyed') throw new InvalidTransitionError(from, target)
		if (from === 'started' && !(target === 'stopped' || target === 'destroyed')) throw new InvalidTransitionError(from, target)
		if (from === 'stopped' && !(target === 'started' || target === 'destroyed')) throw new InvalidTransitionError(from, target)
	}

	private async runHook(hookName: LifecycleHook, hook: () => Promise<void> | void, from: LifecycleState, target: LifecycleState): Promise<void> {
		const tasks: Array<() => Promise<void> | void> = [
			() => hook(),
			() => this.onTransition(from, target, hookName),
		]
		try {
			await new QueueAdapter({ deadline: this.timeouts, concurrency: 1 }).run(tasks)
			this.setState(target)
			this.emitter.emit(hookName)
		}
		catch (err) {
			// Map queue timeouts/shared-deadline errors to TimeoutError; wrap others as LifecycleError
			const isTimeout = err instanceof Error && (err.message.includes('timed out') || err.message.includes('shared deadline exceeded'))
			const wrapped = isTimeout ? new TimeoutError(hookName, this.timeouts) : (err instanceof LifecycleError ? err : new LifecycleError(`Hook '${hookName}' failed`, { cause: err }))
			this.emitter.emit('error', wrapped)
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

	// Hooks (override in subclasses)
	protected async onCreate(): Promise<void> {}
	protected async onStart(): Promise<void> {}
	protected async onStop(): Promise<void> {}
	protected async onDestroy(): Promise<void> {}
	protected async onTransition(_from: LifecycleState, _to: LifecycleState, _hook: LifecycleHook): Promise<void> {}
}
