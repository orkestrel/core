export class Emitter {
	private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

	on(event: string, fn: (...args: unknown[]) => void): this {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set())
		}
		this.listeners.get(event)!.add(fn)
		return this
	}

	off(event: string, fn: (...args: unknown[]) => void): this {
		this.listeners.get(event)?.delete(fn)
		return this
	}

	emit(event: string, ...args: unknown[]): void {
		for (const fn of this.listeners.get(event) ?? []) {
			try {
				fn(...args)
			}
			catch {
				// Intentionally ignore listener errors to avoid breaking emit loop
			}
		}
	}

	removeAllListeners(): void {
		this.listeners.clear()
	}
}
