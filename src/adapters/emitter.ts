import type { DiagnosticPort, EmitterAdapterOptions, EmitterPort, LoggerPort } from '../types.js'
import { LoggerAdapter } from './logger'
import { DiagnosticAdapter } from './diagnostic'
import { safeInvoke } from '../types.js'

export class EmitterAdapter<EMap extends Record<string, unknown[]> = Record<string, unknown[]>> implements EmitterPort<EMap> {
	private listeners: Partial<{ [K in keyof EMap]: Set<(...args: EMap[K]) => void> }> = {}

	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	constructor(options: EmitterAdapterOptions = {}) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		this.#diagnostic = options?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger })
	}

	get logger(): LoggerPort { return this.#logger }

	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	on<E extends keyof EMap & string>(event: E, fn: (...args: EMap[E]) => void): this {
		const set = (this.listeners[event] ??= new Set()) as Set<(...args: EMap[E]) => void>
		set.add(fn)
		return this
	}

	off<E extends keyof EMap & string>(event: E, fn: (...args: EMap[E]) => void): this {
		const set = this.listeners[event] as Set<(...args: EMap[E]) => void> | undefined
		if (set) {
			set.delete(fn)
			if (set.size === 0) this.listeners[event] = undefined
		}
		return this
	}

	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void {
		const set = this.listeners[event] as Set<(...args: EMap[E]) => void> | undefined
		if (!set || set.size === 0) return
		// snapshot to avoid issues if listeners add/remove during iteration
		const listeners = Array.from(set)
		for (const fn of listeners) {
			safeInvoke(fn, ...args)
		}
	}

	removeAllListeners(): void { this.listeners = {} }
}
