import type { RegistryPort, RegistryAdapterOptions, DiagnosticPort, LoggerPort } from '../types.js'
import { HELP, REGISTRY_MESSAGES } from '../constants.js'
import { DiagnosticAdapter } from './diagnostic.js'
import { LoggerAdapter } from './logger.js'

/**
 * RegistryAdapter<T>: named instance registry with optional default and locking.
 * - Supports string and symbol keys.
 * - Prevents replacing the default or locked entries.
 *
 * Example
 * -------
 * ```ts
 * const reg = new RegistryAdapter<number>({ label: 'answer', default: { value: 42 } })
 * reg.set('alt', 7)
 * const def = reg.resolve()   // 42
 * const alt = reg.resolve('alt') // 7
 * reg.clear('alt')
 * ```
 */
export class RegistryAdapter<T> implements RegistryPort<T> {
	private readonly store = new Map<string | symbol, T>()
	private readonly locked = new Set<string | symbol>()
	private readonly label: string
	private readonly defaultKey?: symbol
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 *
	 * @param options
	 * @returns -
	 * @example
	 */
	constructor(options: RegistryAdapterOptions<T> = {}) {
		this.label = options.label ?? 'registry'
		this.#logger = options.logger ?? new LoggerAdapter()
		this.#diagnostic = options.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: REGISTRY_MESSAGES })
		if (options.default) {
			this.defaultKey = options.default.key ?? Symbol(`${this.label}.default`)
			this.store.set(this.defaultKey, options.default.value)
		}
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

	/**
	 * Get a named value without throwing; returns undefined if missing.
	 * @param name - string or symbol key; when omitted, the default key is used.
	 * @returns -
	 * @example
	 */
	get(name?: string | symbol): T | undefined {
		const key = name ?? this.defaultKey
		return key === undefined ? undefined : this.store.get(key)
	}

	/**
	 * Resolve a named value or throw with ORK1001/ORK1002 when missing.
	 * @param name - string or symbol key; when omitted, resolves the default key.
	 * @returns -
	 * @example
	 */
	resolve(name?: string | symbol): T {
		const key = name ?? this.defaultKey
		if (key === undefined) {
			this.#diagnostic.fail('ORK1001', { scope: 'registry', message: `No ${this.label} instance registered for '<default>'`, helpUrl: HELP.registry, extra: { label: this.label, name: '<default>' } })
		}
		const v = this.store.get(key)
		if (v === undefined) {
			this.#diagnostic.fail('ORK1002', { scope: 'registry', message: `No ${this.label} instance registered for '${String(key)}'`, helpUrl: HELP.registry, extra: { label: this.label, name: String(key) } })
		}
		return v
	}

	/**
	 * Register or replace a named instance.
	 * @param name - string or symbol key
	 * @param value - the instance to store
	 * @param lock - when true, prevents further replacement for this key
	 * @returns -
	 * @example
	 */
	set(name: string | symbol, value: T, lock = false): void {
		if (this.defaultKey !== undefined && name === this.defaultKey) {
			this.#diagnostic.fail('ORK1003', { scope: 'registry', message: `Cannot replace default ${this.label} instance`, helpUrl: HELP.registry, extra: { label: this.label } })
		}
		if (this.locked.has(name)) {
			this.#diagnostic.fail('ORK1004', { scope: 'registry', message: `Cannot replace locked ${this.label} instance for '${String(name)}'`, helpUrl: HELP.registry, extra: { label: this.label, name: String(name) } })
		}
		this.store.set(name, value)
		if (lock) this.locked.add(name)
	}

	/**
	 * Clear a named instance (default is protected) and return true if removed.
     * @param name - string or symbol key
	 * @param force - when true, allows clearing a locked instance.
	 * @returns -
	 * @example
	 */
	clear(name?: string | symbol, force = false): boolean {
		const key = name ?? this.defaultKey
		if (key === undefined) return false
		// Default is protected regardless of force
		if (this.defaultKey !== undefined && key === this.defaultKey) return false
		if (this.locked.has(key) && !force) return false
		this.locked.delete(key)
		return this.store.delete(key)
	}

	/** List all registered keys (including the default key symbol when present). */
	list(): ReadonlyArray<string | symbol> { return Array.from(this.store.keys()) }
}
