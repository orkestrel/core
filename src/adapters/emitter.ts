import type { DiagnosticPort, EmitterAdapterOptions, EmitterPort, EmitterListener, EventMap, LoggerPort } from '../types.js'
import { safeInvoke } from '../helpers.js'
import { LoggerAdapter } from './logger.js'
import { DiagnosticAdapter } from './diagnostic.js'

/**
 * EmitterAdapter: minimal in-memory event emitter used by Lifecycle and others.
 * - Stores per-event listeners as sets and invokes them synchronously.
 * - Errors thrown by listeners are isolated via safeInvoke.
 *
 * Example
 * -------
 * ```ts
 * type Map = { start: [], data: [string] }
 * const emitter = new EmitterAdapter<Map>()
 * const onData = (s: string) => console.log('data:', s)
 * emitter.on('data', onData)
 * emitter.emit('start')
 * emitter.emit('data', 'hello')
 * emitter.off('data', onData)
 * ```
 */
export class EmitterAdapter<EMap extends EventMap = EventMap> implements EmitterPort<EMap> {
	// Internal registry: per-event sets of listener values (stored as unknown to avoid over-constraining types).
	private readonly listeners = new Map<keyof EMap & string, Set<unknown>>()

	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 *
	 * @param options
	 * @returns -
	 * @example
	 */
	constructor(options: EmitterAdapterOptions = {}) {
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

	// Type guard to narrow stored unknowns to the properly-typed listener for a specific event key E.
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
	 * Register a listener for an event.
	 * @param event - Event name (key in EMap)
	 * @param fn - Listener function receiving tuple-typed args
	 * @returns this for chaining
	 * @example
	 */
	on<E extends keyof EMap & string>(event: E, fn: EmitterListener<EMap, E>): this {
		this.getOrCreateSet(event).add(fn)
		return this
	}

	/**
	 * Remove a previously registered listener.
	 * @param event
	 * @param fn
	 * @returns this for chaining
	 * @example
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
	 * Emit an event with arguments; listeners are invoked synchronously in insertion order.
	 * @param event
	 * @param args
	 * @returns -
	 * @example
	 */
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void {
		const set = this.listeners.get(event)
		if (!set || set.size === 0) return
		// Snapshot to protect against mutation during iteration
		const snapshot = Array.from(set)
		for (const v of snapshot) {
			if (this.isListener<E>(v)) {
				safeInvoke(v, ...args)
			}
		}
	}

	/** Remove all listeners for all events (used by Lifecycle.destroy). */
	removeAllListeners(): void { this.listeners.clear() }
}
