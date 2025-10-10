import type { DiagnosticPort, EmitterAdapterOptions, EmitterPort, EmitterListener, EventMap, LoggerPort } from '../types.js'
import { safeInvoke } from '../helpers.js'
import { LoggerAdapter } from './logger.js'
import { DiagnosticAdapter } from './diagnostic.js'

/**
 * In-memory event emitter implementation with typed tuple-based events.
 *
 * Stores per-event listeners in sets and invokes them synchronously in insertion order.
 * Errors thrown by listeners are isolated via safeInvoke to prevent cascading failures.
 *
 * @example
 * ```ts
 * import { EmitterAdapter } from '@orkestrel/core'
 * type Events = { start: [], data: [string], error: [Error] }
 * const emitter = new EmitterAdapter<Events>()
 * const onData = (s: string) => console.log('received:', s)
 * emitter.on('data', onData)
 * emitter.emit('start')
 * emitter.emit('data', 'hello world')
 * emitter.off('data', onData)
 * emitter.removeAllListeners()
 * ```
 */
export class EmitterAdapter<EMap extends EventMap = EventMap> implements EmitterPort<EMap> {
	// Internal registry of per-event listeners.
	private readonly listeners = new Map<keyof EMap & string, Set<unknown>>()

	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 * Construct an EmitterAdapter with optional logger and diagnostic ports.
	 *
	 * @param options - Optional configuration including logger and diagnostic ports
	 * @example
	 * ```ts
	 * const emitter = new EmitterAdapter({ logger: customLogger })
	 * ```
	 */
	constructor(options: EmitterAdapterOptions = {}) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		this.#diagnostic = options?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger })
	}

	/**
	 * Access the logger port used by this emitter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Access the diagnostic port used by this emitter.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	// Type guard to narrow stored unknowns to a properly-typed listener for event E.
	private isListener<E extends keyof EMap & string>(v: unknown): v is EmitterListener<EMap, E> {
		return typeof v === 'function'
	}

	// Fetch existing Set for an event or create it lazily.
	private getOrCreateSet<E extends keyof EMap & string>(event: E): Set<unknown> {
		let set = this.listeners.get(event)
		if (!set) {
			set = new Set<unknown>()
			this.listeners.set(event, set)
		}
		return set
	}

	/**
	 * Register a listener function for a specific event.
	 *
	 * @param event - Event name (key in the event map)
	 * @param fn - Listener function that receives tuple-typed arguments matching the event signature
	 * @returns This emitter instance for method chaining
     *
	 * @example
	 * ```ts
	 * emitter.on('data', (value: string) => console.log('data:', value))
	 * ```
	 */
	on<E extends keyof EMap & string>(event: E, fn: EmitterListener<EMap, E>): this {
		this.getOrCreateSet(event).add(fn)
		return this
	}

	/**
	 * Remove a previously registered listener for a specific event.
	 *
	 * @param event - Event name (key in the event map)
	 * @param fn - The exact listener function to remove
	 * @returns This emitter instance for method chaining
     *
	 * @example
	 * ```ts
	 * const handler = (s: string) => console.log(s)
	 * emitter.on('data', handler)
	 * emitter.off('data', handler)
	 * ```
	 */
	off<E extends keyof EMap & string>(event: E, fn: EmitterListener<EMap, E>): this {
		const set = this.listeners.get(event)
		if (set) {
			set.delete(fn)
			if (set.size === 0) this.listeners.delete(event)
		}
		return this
	}

	/**
	 * Emit an event with arguments, invoking all registered listeners synchronously.
	 *
	 * @param event - Event name (key in the event map)
	 * @param args - Arguments matching the event's tuple signature
	 * @returns void (invokes listeners synchronously if any are registered)
     *
	 * @example
	 * ```ts
	 * emitter.emit('data', 'hello world')
	 * ```
	 */
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void {
		const set = this.listeners.get(event)
		if (!set || set.size === 0) return
		const snapshot = Array.from(set)
		for (const v of snapshot) {
			if (this.isListener<E>(v)) {
				safeInvoke(v, ...args)
			}
		}
	}

	/**
	 * Remove all registered listeners for all events.
	 *
	 * @returns void (clears all event listener registrations)
	 */
	removeAllListeners(): void { this.listeners.clear() }
}
