import type { DiagnosticInterface, EmitterAdapterOptions, EmitterInterface, EventListener, EventMap, LoggerInterface, Unsubscribe } from '../types.js'
import { isFunction, safeInvoke } from '../helpers.js'
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
export class EmitterAdapter<EMap extends EventMap = EventMap> implements EmitterInterface<EMap> {
	// Internal registry of per-event listeners.
	readonly #listeners = new Map<keyof EMap & string, Set<unknown>>()

	readonly #logger: LoggerInterface
	readonly #diagnostic: DiagnosticInterface

	/**
	 * Construct an EmitterAdapter with optional logger and diagnostic ports.
	 *
	 * @param options - Configuration options:
	 * - logger: Optional logger port used for emitting any diagnostics
	 * - diagnostic: Optional diagnostic port for telemetry and errors
     *
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
	get logger(): LoggerInterface { return this.#logger }

	/**
	 * Access the diagnostic port used by this emitter.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticInterface { return this.#diagnostic }

	/**
	 * Register a listener function for a specific event.
	 *
	 * @param event - Event name (key in the event map)
	 * @param fn - Listener function that receives tuple-typed arguments matching the event signature
	 * @returns Unsubscribe function to remove the listener
	 *
	 * @example
	 * ```ts
	 * const unsubscribe = emitter.on('data', (value: string) => console.log('data:', value))
	 * // Later: unsubscribe()
	 * ```
	 */
	on<E extends keyof EMap & string>(event: E, fn: EventListener<EMap, E>): Unsubscribe {
		let set = this.#listeners.get(event)
		if (!set) {
			set = new Set<unknown>()
			this.#listeners.set(event, set)
		}
		set.add(fn)
		return () => {
			const s = this.#listeners.get(event)
			if (s) {
				s.delete(fn)
				if (s.size === 0) this.#listeners.delete(event)
			}
		}
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
		const set = this.#listeners.get(event)
		if (!set || set.size === 0) return
		const snapshot = Array.from(set)
		for (const v of snapshot) {
			if (isFunction(v)) {
				safeInvoke(v, ...args)
			}
		}
	}

	/**
	 * Remove all registered listeners for all events.
	 *
	 * @returns void (clears all event listener registrations)
	 *
	 * @example
	 * ```ts
	 * emitter.removeAllListeners()
	 * ```
	 */
	removeAllListeners(): void { this.#listeners.clear() }
}
