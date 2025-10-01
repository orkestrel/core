// Lifecycle core with protected onX hook pattern
// Public methods: create, start, stop, destroy
// Extension points: onCreate, onStart, onStop, onDestroy

import { InvalidTransitionError, LifecycleError, TimeoutError } from './diagnostics.js'
import { Emitter } from './emitter.js'

export type LifecycleState = 'created' | 'started' | 'stopped' | 'destroyed'
export interface LifecycleOptions { hookTimeoutMs?: number, onTransitionFilter?: (from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy') => boolean }

type EventMap = {
	stateChange: [LifecycleState]
	create: []
	start: []
	stop: []
	destroy: []
	error: [LifecycleError]
}

export abstract class Lifecycle {
	private _state: LifecycleState = 'created'
	private readonly hookTimeoutMs: number
	private readonly emitter = new Emitter()
	private readonly onTransitionFilter: (from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy') => boolean

	constructor(opts: LifecycleOptions = {}) {
		this.hookTimeoutMs = opts.hookTimeoutMs ?? 5000
		this.onTransitionFilter = opts.onTransitionFilter ?? (() => true)
		// defer initial state event
		if (typeof queueMicrotask === 'function') {
			queueMicrotask(() => this.emitter.emit('stateChange', this._state))
		}
		else {
			setTimeout(() => this.emitter.emit('stateChange', this._state), 0)
		}
	}

	get state(): LifecycleState { return this._state }
	protected setState(next: LifecycleState): void {
		this._state = next
		this.emitter.emit('stateChange', next)
	}

	on<T extends keyof EventMap>(evt: T, fn: (...args: EventMap[T]) => void): this {
		this.emitter.on(evt as string, fn as unknown as (...args: unknown[]) => void)
		return this
	}

	off<T extends keyof EventMap>(evt: T, fn: (...args: EventMap[T]) => void): this {
		this.emitter.off(evt as string, fn as unknown as (...args: unknown[]) => void)
		return this
	}

	private validateTransition(target: LifecycleState): void {
		const from = this._state
		if (from === 'destroyed') throw new InvalidTransitionError(from, target)
		if (from === 'created' && target !== 'started' && target !== 'destroyed') throw new InvalidTransitionError(from, target)
		if (from === 'started' && !(target === 'stopped' || target === 'destroyed')) throw new InvalidTransitionError(from, target)
		if (from === 'stopped' && !(target === 'started' || target === 'destroyed')) throw new InvalidTransitionError(from, target)
	}

	private async runHook(hookName: 'create' | 'start' | 'stop' | 'destroy', hook: () => Promise<void> | void, from: LifecycleState, target: LifecycleState): Promise<void> {
		let timeoutId: ReturnType<typeof setTimeout> | undefined
		const timeout = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => reject(new TimeoutError(hookName, this.hookTimeoutMs)), this.hookTimeoutMs)
		})
		try {
			await Promise.race([Promise.resolve(hook()), timeout])
			// between states: allow subclasses to observe/act on transition
			if (this.onTransitionFilter(from, target, hookName)) {
				await Promise.race([Promise.resolve(this.onTransition(from, target, hookName)), timeout])
			}
			clearTimeout(timeoutId)
			this.setState(target)
			this.emitter.emit(hookName)
		}
		catch (err) {
			clearTimeout(timeoutId)
			const wrapped = err instanceof LifecycleError ? err : new LifecycleError(`Hook '${hookName}' failed`, err)
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
	protected async onTransition(_from: LifecycleState, _to: LifecycleState, _hook: 'create' | 'start' | 'stop' | 'destroy'): Promise<void> {}
}
