import { D } from '../diagnostics.js'
import type { RegistryPort, RegistryAdapterOptions } from '../types.js'

export class RegistryAdapter<T> implements RegistryPort<T> {
	private readonly store = new Map<string | symbol, T>()
	private readonly locked = new Set<string | symbol>()
	private readonly label: string
	private readonly defaultKey?: symbol

	constructor(options: RegistryAdapterOptions<T> = {}) {
		this.label = options.label ?? 'registry'
		if (options.default) {
			this.defaultKey = options.default.key ?? Symbol(`${this.label}.default`)
			this.store.set(this.defaultKey, options.default.value)
		}
	}

	get(name?: string | symbol): T | undefined {
		const key = name ?? this.defaultKey
		return key === undefined ? undefined : this.store.get(key)
	}

	resolve(name?: string | symbol): T {
		const key = name ?? this.defaultKey
		if (key === undefined) throw D.registryNoDefault(this.label)
		const v = this.store.get(key)
		if (v === undefined) throw D.registryNoNamed(this.label, String(key))
		return v
	}

	set(name: string | symbol, value: T, lock = false): void {
		if (this.defaultKey !== undefined && name === this.defaultKey) {
			throw D.registryCannotReplaceDefault(this.label)
		}
		if (this.locked.has(name)) {
			throw D.registryCannotReplaceLocked(this.label, String(name))
		}
		this.store.set(name, value)
		if (lock) this.locked.add(name)
	}

	clear(name?: string | symbol, force = false): boolean {
		const key = name ?? this.defaultKey
		if (key === undefined) return false
		// Default is protected regardless of force
		if (this.defaultKey !== undefined && key === this.defaultKey) return false
		if (this.locked.has(key) && !force) return false
		this.locked.delete(key)
		return this.store.delete(key)
	}

	list(): ReadonlyArray<string | symbol> { return Array.from(this.store.keys()) }
}
