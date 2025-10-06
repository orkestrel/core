import type { EmitterListener, EmitterPort } from '../types.js'

export class EmitterAdapter implements EmitterPort {
	private listeners: Map<string, Set<EmitterListener>> = new Map()

	on(event: string, fn: EmitterListener): this {
		if (!this.listeners.has(event)) this.listeners.set(event, new Set())
		this.listeners.get(event)!.add(fn)
		return this
	}

	off(event: string, fn: EmitterListener): this {
		this.listeners.get(event)?.delete(fn)
		return this
	}

	emit(event: string, ...args: unknown[]): void {
		for (const fn of this.listeners.get(event) ?? []) {
			try {
				fn(...args)
			}
			catch { /* swallow listener errors */ }
		}
	}

	removeAllListeners(): void { this.listeners.clear() }
}
