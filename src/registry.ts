import { D } from './diagnostics.js'

export class Registry<T> {
	private readonly store = new Map<string | symbol, T>()
	private readonly locked = new Set<string | symbol>()
	private readonly label: string
	private readonly defaultKey?: symbol

	constructor(label: string, defaultValue?: T, defaultKey?: symbol) {
		this.label = label
		if (defaultValue !== undefined) {
			this.defaultKey = defaultKey ?? Symbol(`${label}.default`)
			this.store.set(this.defaultKey, defaultValue)
		}
	}

	// Non-throwing lookup: returns undefined if missing
	get(name?: string | symbol): T | undefined {
		const key = name ?? this.defaultKey
		return key === undefined ? undefined : this.store.get(key)
	}

	// Strict lookup: throws if missing
	resolve(name?: string | symbol): T {
		const key = name ?? this.defaultKey
		if (key === undefined) throw D.registryNoDefault(this.label)
		const v = this.store.get(key)
		if (!v) throw D.registryNoNamed(this.label, String(key))
		return v
	}

	set(nameOrKey: string | symbol, value: T, lock = false): void {
		if (this.defaultKey !== undefined && nameOrKey === this.defaultKey) {
			throw D.registryCannotReplaceDefault(this.label)
		}
		if (this.locked.has(nameOrKey)) {
			throw D.registryCannotReplaceLocked(this.label, String(nameOrKey))
		}
		this.store.set(nameOrKey, value)
		if (lock) this.locked.add(nameOrKey)
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

	list(): (string | symbol)[] { return Array.from(this.store.keys()) }
}
