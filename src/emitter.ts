/**
 * Minimal event emitter used internally by {@link Lifecycle}.
 *
 * Listener errors are swallowed to avoid breaking emit loops.
 */
export class Emitter {
	private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

	/** Subscribe to an event. */
	on(event: string, fn: (...args: unknown[]) => void): this {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set())
		}
		this.listeners.get(event)!.add(fn)
		return this
	}

	/** Unsubscribe a specific listener from an event. */
	off(event: string, fn: (...args: unknown[]) => void): this {
		this.listeners.get(event)?.delete(fn)
		return this
	}

	/** Emit an event with arguments to all registered listeners. */
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

	/** Remove all listeners from all events. */
	removeAllListeners(): void {
		this.listeners.clear()
	}
}
