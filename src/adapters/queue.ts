import type { QueuePort, QueueAdapterOptions, QueueRunOptions } from '../types.js'

export class QueueAdapter<T = unknown> implements QueuePort<T> {
	private readonly items: T[] = []
	private readonly capacity?: number
	private readonly defaults: QueueRunOptions

	constructor(options: QueueAdapterOptions = {}) {
		this.capacity = options.capacity
		this.defaults = {
			concurrency: options.concurrency,
			deadline: options.deadline,
			timeout: options.timeout,
			signal: options.signal,
		}
	}

	async enqueue(item: T): Promise<void> {
		if (typeof this.capacity === 'number' && this.items.length >= this.capacity) {
			return Promise.reject(new Error('QueueAdapter: capacity exceeded'))
		}
		this.items.push(item)
	}

	async dequeue(): Promise<T | undefined> { return this.items.length ? this.items.shift() : undefined }
	async size(): Promise<number> { return this.items.length }

	async run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options: QueueRunOptions = {}): Promise<ReadonlyArray<R>> {
		const opts: QueueRunOptions = { ...this.defaults, ...options }
		const n = tasks.length
		if (n === 0) return []
		const c0 = opts.concurrency
		const c = (() => {
			if (typeof c0 !== 'number' || !Number.isFinite(c0)) return n
			const v = Math.floor(c0)
			return v > 0 ? Math.min(v, n) : n
		})()

		const results = new Array<R>(n)
		const sharedEnd = typeof opts.deadline === 'number' && Number.isFinite(opts.deadline)
			? Date.now() + Math.max(0, Math.floor(opts.deadline))
			: undefined
		let abortError: unknown | null = null
		let nextIdx = 0

		const withTimeout = async <U>(fn: () => Promise<U> | U, idx: number): Promise<U> => {
			const now = Date.now()
			const remaining = sharedEnd ? Math.max(0, sharedEnd - now) : undefined
			const taskCap = typeof opts.timeout === 'number' && Number.isFinite(opts.timeout)
				? Math.max(0, Math.floor(opts.timeout))
				: undefined
			const cap = remaining == null ? taskCap : (taskCap == null ? remaining : Math.min(remaining, taskCap))
			// If a shared deadline is in effect and is the limiting factor, prefer the shared-deadline error.
			const dueToShared = sharedEnd != null && (taskCap == null || (remaining != null && remaining <= taskCap))
			if (cap != null && cap === 0) throw new Error(dueToShared ? 'QueueAdapter: shared deadline exceeded' : `QueueAdapter: task #${idx} timed out`)
			let tId: ReturnType<typeof setTimeout> | undefined
			if (cap == null) return Promise.resolve(fn())
			try {
				return await Promise.race([
					Promise.resolve(fn()),
					new Promise<never>((_, reject) => { tId = setTimeout(() => reject(new Error(dueToShared ? 'QueueAdapter: shared deadline exceeded' : `QueueAdapter: task #${idx} timed out`)), cap) }),
				])
			}
			finally {
				if (tId != null) clearTimeout(tId)
			}
		}

		if (opts.signal?.aborted) return Promise.reject(new Error('QueueAdapter: aborted'))

		const worker = async () => {
			while (abortError == null) {
				if (opts.signal?.aborted) {
					abortError = new Error('QueueAdapter: aborted')
					break
				}
				if (sharedEnd != null && Date.now() >= sharedEnd) {
					abortError = new Error('QueueAdapter: shared deadline exceeded')
					break
				}
				const idx = nextIdx++
				if (idx >= n) break
				try {
					results[idx] = await withTimeout(tasks[idx], idx)
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
