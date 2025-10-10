import type { RegistryPort, RegistryAdapterOptions, DiagnosticPort, LoggerPort } from '../types.js'
import { HELP, REGISTRY_MESSAGES } from '../constants.js'
import { DiagnosticAdapter } from './diagnostic.js'
import { LoggerAdapter } from './logger.js'

/**
 * Named instance registry with optional default and locking support.
 *
 * Provides a type-safe registry for storing and retrieving named instances. Supports both
 * string and symbol keys. Optionally designates a default instance that cannot be replaced.
 * Individual entries can be locked to prevent replacement. Commonly used by Container and
 * Orchestrator for managing global instances.
 *
 * @example
 * ```ts
 * import { RegistryAdapter } from '@orkestrel/core'
 * const reg = new RegistryAdapter<number>({
 *   label: 'config',
 *   default: { value: 42 }
 * })
 * reg.set('alt', 7, true) // locked=true prevents replacement
 * const def = reg.resolve()        // 42
 * const alt = reg.resolve('alt')   // 7
 * reg.clear('alt')                 // false (locked)
 * reg.clear('alt', true)           // true (forced)
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
	 * Construct a RegistryAdapter with optional label and default instance.
	 *
	 * @param options - Configuration options:
	 * - label: Human-readable label used in error messages (default: 'registry')
	 * - default: Optional default entry with value and optional key.
	 * - logger: Optional logger port for diagnostics
	 * - diagnostic: Optional diagnostic port for error reporting
	 *
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
	 * Access the logger port used by this registry.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Access the diagnostic port used by this registry for error reporting.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/**
	 * Get a named value without throwing an error.
	 *
	 * @param name - String or symbol key; when omitted, the default key is used
	 * @returns The registered value, or undefined if not found
	 *
	 * @example
	 * ```ts
	 * const value = reg.get('myKey')
	 * if (value) console.log('Found:', value)
	 * ```
	 */
	get(name?: string | symbol): T | undefined {
		const key = name ?? this.defaultKey
		return key === undefined ? undefined : this.store.get(key)
	}

	/**
	 * Resolve a named value, throwing an error if not found.
	 *
	 * @param name - String or symbol key; when omitted, resolves the default key
	 * @returns The registered value
	 * @throws Error with code ORK1001 if no default is registered when name is omitted
	 * @throws Error with code ORK1002 if the named instance is not found
	 *
	 * @example
	 * ```ts
	 * const value = reg.resolve('myKey') // throws if not found
	 * const defaultValue = reg.resolve() // throws if no default
	 * ```
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
	 * Register or replace a named instance in the registry.
	 *
	 * @param name - String or symbol key for the instance
	 * @param value - The instance to store
	 * @param lock - When true, prevents further replacement for this key (default: false)
	 * @throws Error with code ORK1003 if attempting to replace the default instance
	 * @throws Error with code ORK1004 if attempting to replace a locked instance
	 * @returns void
	 *
	 * @example
	 * ```ts
	 * reg.set('prod', prodConfig)
	 * reg.set('prod', newConfig, true) // locked=true prevents future replacement
	 * ```
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
	 * Clear a named instance from the registry.
	 *
	 * The default instance is always protected and cannot be cleared. Locked instances
	 * cannot be cleared unless force=true.
	 *
	 * @param name - String or symbol key; when omitted, attempts to clear the default (always fails)
	 * @param force - When true, allows clearing a locked instance (default: false)
	 * @returns True if the instance was removed, false otherwise
	 *
	 * @example
	 * ```ts
	 * reg.clear('staging')           // removes if not locked
	 * reg.clear('prod')              // false if locked
	 * reg.clear('prod', true)        // true (forced removal)
	 * ```
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

	/**
	 * List all registered keys (including the default key symbol when present).
	 *
	 * @returns A read-only array of all registered keys (strings and symbols)
	 *
	 * @example
	 * ```ts
	 * const keys = reg.list()
	 * console.log('Registered keys:', keys)
	 * ```
	 */
	list(): ReadonlyArray<string | symbol> { return Array.from(this.store.keys()) }
}
