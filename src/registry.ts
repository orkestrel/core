export class Registry<T> {
	private readonly store = new Map<string | symbol, T>()
	private readonly label: string
	private readonly defaultKey: symbol

	constructor(label: string, defaultKey: symbol) {
		this.label = label
		this.defaultKey = defaultKey
	}

	get(name?: string | symbol): T {
		const key = name ?? this.defaultKey
		const v = this.store.get(key)
		if (!v) throw new Error(`No ${this.label} instance registered for '${String(key)}` + `')`)
		return v
	}

	tryGet(name?: string | symbol): T | undefined { return this.store.get(name ?? this.defaultKey) }
	set(nameOrKey: string | symbol, value: T): void { this.store.set(nameOrKey, value) }
	setDefault(value: T): void { this.store.set(this.defaultKey, value) }
	clear(name?: string | symbol): boolean { return this.store.delete(name ?? this.defaultKey) }
	list(): (string | symbol)[] { return Array.from(this.store.keys()) }
}
