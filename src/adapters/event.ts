import type { EventHandler, EventPort, EventAdapterOptions, LoggerPort, DiagnosticPort } from '../types.js'
import { safeInvoke } from '../helpers.js'
import { LoggerAdapter } from './logger.js'
import { DiagnosticAdapter } from './diagnostic.js'

/**
 * Topic-based asynchronous publish-subscribe event bus.
 *
 * Provides an in-memory event bus where handlers can subscribe to topics and publishers can emit payloads.
 * Supports both sequential (default) and concurrent handler invocation modes. Errors thrown by handlers
 * are isolated and reported via the optional onError callback and diagnostic port.
 *
 * @example
 * ```ts
 * import { EventAdapter } from '@orkestrel/core'
 * type Events = { 'user:created': { id: string, name: string }, 'user:deleted': { id: string } }
 * const bus = new EventAdapter<Events>({ sequential: true })
 * const unsubscribe = await bus.subscribe('user:created', async (payload) => {
 *   console.log('User created:', payload.id, payload.name)
 * })
 * await bus.publish('user:created', { id: 'u1', name: 'Alice' })
 * await unsubscribe()
 * ```
 */
export class EventAdapter implements EventPort {
	private readonly map = new Map<string, Set<unknown>>()
	private readonly onError?: (err: unknown, topic: string) => void
	private readonly sequential: boolean

	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 * Construct an EventAdapter with optional configuration.
	 *
	 * @param options - Configuration options for the event adapter
	 * @param options.onError - Optional callback invoked when a handler throws an error
	 * @param options.sequential - When true (default), handlers are invoked sequentially; when false, handlers run concurrently
	 * @param options.logger - Optional logger port for diagnostics
	 * @param options.diagnostic - Optional diagnostic port for telemetry
	 *
	 * @example
	 * ```ts
	 * const bus = new EventAdapter({
	 *   sequential: false,
	 *   onError: (err, topic) => console.error(`Error in ${topic}:`, err)
	 * })
	 * ```
	 */
	constructor(options: EventAdapterOptions = {}) {
		this.onError = options.onError
		this.sequential = options.sequential !== false

		this.#logger = options?.logger ?? new LoggerAdapter()
		this.#diagnostic = options?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger })
	}

	/**
	 * Access the logger port used by this event adapter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Access the diagnostic port used by this event adapter.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/** Type guard to narrow unknown values to EventHandler. */
	private isHandler<T>(v: unknown): v is EventHandler<T> { return typeof v === 'function' }

	/**
	 * Publish a payload to a topic, invoking all subscribed handlers.
	 *
	 * In sequential mode (default), handlers are awaited one-by-one in subscription order.
	 * In concurrent mode, handlers are invoked in parallel via Promise.all.
	 * Handler errors are isolated and reported via onError and diagnostic callbacks.
	 *
	 * @param topic - The topic name to publish to
	 * @param payload - The payload value to pass to all subscribed handlers
	 *
	 * @example
	 * ```ts
	 * await bus.publish('user:created', { id: 'u123', name: 'Bob' })
	 * ```
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
	 * Subscribe a handler function to a topic.
	 *
	 * The handler will be invoked whenever a payload is published to the topic.
	 * Returns an unsubscribe function to remove the handler later.
	 *
	 * @param topic - The topic name to subscribe to
	 * @param handler - Handler function (sync or async) that receives the topic payload
	 * @returns An async unsubscribe function that removes the handler when called
	 *
	 * @example
	 * ```ts
	 * const unsubscribe = await bus.subscribe('user:created', async (user) => {
	 *   console.log('New user:', user.name)
	 * })
	 * // Later, to unsubscribe:
	 * await unsubscribe()
	 * ```
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

	/**
	 * List all currently active topic names that have at least one subscriber.
	 *
	 * @returns A read-only array of topic name strings
	 *
	 * @example
	 * ```ts
	 * console.log('Active topics:', bus.topics())
	 * // => ['user:created', 'user:deleted']
	 * ```
	 */
	topics(): ReadonlyArray<string> {
		return Array.from(this.map.keys())
	}
}
