import type { EventHandler, EventPort, EventAdapterOptions, LoggerPort, DiagnosticPort } from '../types.js'
import { safeInvoke } from '../types.js'
import { LoggerAdapter } from './logger'
import { DiagnosticAdapter } from './diagnostic'

type Handler<T> = (payload: T) => void | Promise<void>

export class EventAdapter implements EventPort {
	private readonly map = new Map<string, Set<Handler<unknown>>>()
	private readonly onError?: (err: unknown, topic: string) => void
	private readonly sequential: boolean

	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	constructor(options: EventAdapterOptions = {}) {
		this.onError = options.onError
		this.sequential = options.sequential !== false

		this.#logger = options?.logger ?? new LoggerAdapter()
		this.#diagnostic = options?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger })
	}

	get logger(): LoggerPort { return this.#logger }

	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	async publish<T>(topic: string, payload: T): Promise<void> {
		const handlers = this.map.get(topic)
		if (!handlers || handlers.size === 0) return
		const arr = Array.from(handlers) as Array<Handler<T>>
		const handleErr = (err: unknown) => {
			safeInvoke(this.onError, err, topic)
			safeInvoke(this.#diagnostic.error.bind(this.#diagnostic), err, { scope: 'internal', extra: { topic, original: err, originalMessage: err instanceof Error ? err.message : String(err), originalStack: err instanceof Error ? err.stack : undefined } })
		}
		if (this.sequential) {
			for (const h of arr) {
				try {
					await h(payload)
				}
				catch (err) {
					handleErr(err)
				}
			}
			return
		}
		await Promise.all(arr.map(async (h) => {
			try {
				await h(payload)
			}
			catch (err) {
				handleErr(err)
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
}
