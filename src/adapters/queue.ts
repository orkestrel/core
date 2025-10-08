import type { QueuePort, QueueAdapterOptions, QueueRunOptions, LoggerPort, DiagnosticPort } from '../types.js'
import { LoggerAdapter } from './logger'
import { DiagnosticAdapter } from './diagnostic'
import { QUEUE_MESSAGES } from '../diagnostics.js'

export class QueueAdapter<T = unknown> implements QueuePort<T> {
	private readonly items: T[] = []
	private readonly capacity?: number
	private readonly defaults: QueueRunOptions
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	constructor(options: QueueAdapterOptions = {}) {
		this.capacity = options.capacity
		this.#logger = options?.logger ?? new LoggerAdapter()
		this.#diagnostic = options?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: QUEUE_MESSAGES })
		this.defaults = {
			concurrency: options.concurrency,
			deadline: options.deadline,
			timeout: options.timeout,
			signal: options.signal,
		}
	}

	get logger(): LoggerPort { return this.#logger }

	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	async enqueue(item: T): Promise<void> {
		if (typeof this.capacity === 'number' && this.items.length >= this.capacity) {
			this.#diagnostic.fail('ORK1050', { scope: 'internal', message: 'QueueAdapter: capacity exceeded' })
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

		const diag = this.#diagnostic
		const withTimeout = async <U>(fn: () => Promise<U> | U, idx: number): Promise<U> => {
			const now = Date.now()
			const remaining = sharedEnd ? Math.max(0, sharedEnd - now) : undefined
			const taskCap = typeof opts.timeout === 'number' && Number.isFinite(opts.timeout)
				? Math.max(0, Math.floor(opts.timeout))
				: undefined
			const cap = remaining == null ? taskCap : (taskCap == null ? remaining : Math.min(remaining, taskCap))
			// If a shared deadline is in effect and is the limiting factor, prefer the shared-deadline error.
			const dueToShared = sharedEnd != null && (taskCap == null || (remaining != null && remaining <= taskCap))
			if (cap != null && cap === 0) diag.fail(dueToShared ? 'ORK1053' : 'ORK1052', { scope: 'internal', message: dueToShared ? 'QueueAdapter: shared deadline exceeded' : `QueueAdapter: task #${idx} timed out` })
			let tId: ReturnType<typeof setTimeout> | undefined
			if (cap == null) return Promise.resolve(fn())
			try {
				return await Promise.race([
					Promise.resolve(fn()),
					new Promise<never>((_, reject) => {
						tId = setTimeout(() => {
							try {
								diag.fail(dueToShared ? 'ORK1053' : 'ORK1052', { scope: 'internal', message: dueToShared ? 'QueueAdapter: shared deadline exceeded' : `QueueAdapter: task #${idx} timed out` })
							}
							catch (e) { reject(e as never) }
						}, cap)
					}),
				])
			}
			finally {
				if (tId != null) clearTimeout(tId)
			}
		}

		if (opts.signal?.aborted) return Promise.reject((() => {
			try {
				this.#diagnostic.fail('ORK1051', { scope: 'internal', message: 'QueueAdapter: aborted' })
			}
			catch (e) { return e }
		})() as Error)

		const worker = async () => {
			while (abortError == null) {
				if (opts.signal?.aborted) {
					try {
						this.#diagnostic.fail('ORK1051', { scope: 'internal', message: 'QueueAdapter: aborted' })
					}
					catch (e) { abortError = e }
					break
				}
				if (sharedEnd != null && Date.now() >= sharedEnd) {
					try {
						this.#diagnostic.fail('ORK1053', { scope: 'internal', message: 'QueueAdapter: shared deadline exceeded' })
					}
					catch (e) { abortError = e }
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
