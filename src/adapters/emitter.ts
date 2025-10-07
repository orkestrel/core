import type { EmitterPort } from '../types.js'

export class EmitterAdapter<EMap extends Record<string, unknown[]> = Record<string, unknown[]>> implements EmitterPort<EMap> {
	private listeners: Partial<{ [K in keyof EMap]: Set<(...args: EMap[K]) => void> }> = {}

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
			try {
				fn(...args)
			}
			catch { /* swallow listener errors */ }
		}
	}

	removeAllListeners(): void { this.listeners = {} }
}
