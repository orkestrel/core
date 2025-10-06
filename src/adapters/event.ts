import type { EventHandler, EventPort, EventAdapterOptions } from '../types.js'

type Handler<T> = (payload: T) => void | Promise<void>

export class EventAdapter implements EventPort {
	private readonly map = new Map<string, Set<Handler<unknown>>>()
	private readonly onError?: (err: unknown, topic: string) => void
	private readonly sequential: boolean

	constructor(options: EventAdapterOptions = {}) {
		this.onError = options.onError
		this.sequential = options.sequential !== false
	}

	async publish<T>(topic: string, payload: T): Promise<void> {
		const handlers = this.map.get(topic)
		if (!handlers || handlers.size === 0) return
		const arr = Array.from(handlers) as Array<Handler<T>>
		if (this.sequential) {
			for (const h of arr) {
				try {
					await h(payload)
				}
				catch (err) {
					this.safeError(err, topic)
				}
			}
			return
		}
		await Promise.all(arr.map(async (h) => {
			try {
				await h(payload)
			}
			catch (err) {
				this.safeError(err, topic)
			}
		}))
	}

	async subscribe<T>(topic: string, handler: EventHandler<T>): Promise<() => void | Promise<void>> {
		let set = this.map.get(topic)
		if (!set) {
			set = new Set()
			this.map.set(topic, set)
		}
		set.add(handler as Handler<unknown>)
		return () => {
			const s = this.map.get(topic)
			if (s) s.delete(handler as Handler<unknown>)
			if (s && s.size === 0) this.map.delete(topic)
		}
	}

	topics(): ReadonlyArray<string> {
		return Array.from(this.map.keys())
	}

	private safeError(err: unknown, topic: string): void {
		try {
			this.onError?.(err, topic)
		}
		catch { /* swallow */ }
	}
}
