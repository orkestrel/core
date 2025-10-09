import type { EventHandler, EventPort, EventAdapterOptions, LoggerPort, DiagnosticPort } from '../types.js'
import { safeInvoke } from '../helpers.js'
import { LoggerAdapter } from './logger.js'
import { DiagnosticAdapter } from './diagnostic.js'

/**
 * EventAdapter: topic-based async pub/sub.
 * - Sequential mode (default) invokes handlers one-by-one.
 * - Concurrent mode invokes handlers in parallel and isolates errors via onError/diagnostic.
 *
 * Example
 * -------
 * ```ts
 * const bus = new EventAdapter({ sequential: true })
 * const unsubscribe = await bus.subscribe('user:created', async (payload: { id: string }) => {
 *   // handle
 * })
 * await bus.publish('user:created', { id: 'u1' })
 * await unsubscribe() // remove handler
 * ```
 */
export class EventAdapter implements EventPort {
	private readonly map = new Map<string, Set<unknown>>()
	private readonly onError?: (err: unknown, topic: string) => void
	private readonly sequential: boolean

	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 *
	 * @param options
	 * @returns -
	 * @example
	 */
	constructor(options: EventAdapterOptions = {}) {
		this.onError = options.onError
		this.sequential = options.sequential !== false

		this.#logger = options?.logger ?? new LoggerAdapter()
		this.#diagnostic = options?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger })
	}

	/**
	 *
	 * @example
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 *
	 * @example
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	private isHandler<T>(v: unknown): v is EventHandler<T> { return typeof v === 'function' }

	/**
	 * Publish a payload to a topic; handlers are awaited according to sequential/concurrent mode.
	 * @param topic - Topic string
	 * @param payload - Payload value for the topic
	 * @returns -
	 * @example
	 */
	async publish<T>(topic: string, payload: T): Promise<void> {
		const handlers = this.map.get(topic)
		if (!handlers || handlers.size === 0) return
		const arr = Array.from(handlers).filter(this.isHandler<T>)
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

	/**
	 * Subscribe a handler for a topic. Returns a function to unsubscribe.
	 * @param topic - Topic string
	 * @param handler - Async or sync handler invoked with the topic payload
	 * @returns Unsubscribe function (may be awaited)
	 * @example
	 */
	async subscribe<T>(topic: string, handler: EventHandler<T>): Promise<() => void | Promise<void>> {
		let set = this.map.get(topic)
		if (!set) {
			set = new Set<unknown>()
			this.map.set(topic, set)
		}
		set.add(handler)
		return () => {
			const s = this.map.get(topic)
			if (s) s.delete(handler)
			if (s && s.size === 0) this.map.delete(topic)
		}
	}

	/** List active topic names. */
	topics(): ReadonlyArray<string> {
		return Array.from(this.map.keys())
	}
}
