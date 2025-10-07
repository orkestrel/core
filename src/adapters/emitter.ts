import type { EmitterListener, EmitterPort } from '../types.js'

export class EmitterAdapter implements EmitterPort {
	private listeners: Map<string, Set<EmitterListener>> = new Map()

	on(event: string, fn: EmitterListener): this {
		if (!this.listeners.has(event)) this.listeners.set(event, new Set())
		this.listeners.get(event)!.add(fn)
		return this
	}

	off(event: string, fn: EmitterListener): this {
		const set = this.listeners.get(event)
		if (set) {
			set.delete(fn)
			if (set.size === 0) this.listeners.delete(event)
		}
		return this
	}

	emit(event: string, ...args: unknown[]): void {
		const set = this.listeners.get(event)
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

	removeAllListeners(): void { this.listeners.clear() }
}
