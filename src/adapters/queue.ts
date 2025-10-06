import type { QueuePort, QueueAdapterOptions } from '../types.js'

export class QueueAdapter<T> implements QueuePort<T> {
	private readonly items: T[] = []
	private readonly capacity?: number

	constructor(options: QueueAdapterOptions = {}) {
		this.capacity = options.capacity
	}

	async enqueue(item: T): Promise<void> {
		if (typeof this.capacity === 'number' && this.items.length >= this.capacity) {
			return Promise.reject(new Error('QueueAdapter: capacity exceeded'))
		}
		this.items.push(item)
	}

	async dequeue(): Promise<T | undefined> { return this.items.length ? this.items.shift() : undefined }
	async size(): Promise<number> { return this.items.length }

	// Execute tasks with optional concurrency, preserving result order and aborting on first error
	async run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: { readonly concurrency?: number }): Promise<ReadonlyArray<R>> {
		const n = tasks.length
		if (n === 0) return []
		const c0 = options?.concurrency
		const c = (() => {
			if (typeof c0 !== 'number' || !Number.isFinite(c0)) return n
			const v = Math.floor(c0)
			return v > 0 ? Math.min(v, n) : n
		})()

		// Use a temporary FIFO queue to distribute jobs to workers
		const q = new QueueAdapter<{ idx: number, fn: () => Promise<R> | R }>()
		for (let i = 0; i < n; i++) await q.enqueue({ idx: i, fn: tasks[i] })

		const results = new Array<R>(n)
		let abortError: unknown | null = null

		const worker = async () => {
			while (abortError == null) {
				const item = await q.dequeue()
				if (!item) break
				try {
					// Ensure promise-awareness and preserve order by index
					results[item.idx] = await Promise.resolve(item.fn())
				}
				catch (err) {
					if (abortError == null) abortError = err
					break
				}
			}
		}

		const workers = Array.from({ length: c }, () => worker())
		await Promise.allSettled(workers)
		if (abortError != null) return Promise.reject(abortError)
		return results
	}
}
