import type { QueuePort, QueueAdapterOptions, QueueRunOptions, LoggerPort, DiagnosticPort } from '../types.js'
import { LoggerAdapter } from './logger.js'
import { DiagnosticAdapter } from './diagnostic.js'
import { QUEUE_MESSAGES } from '../constants.js'

/**
 * In-memory task queue with concurrency control, timeouts, and shared deadlines.
 *
 * Provides a FIFO queue for items and a task runner that can execute tasks with configurable
 * concurrency limits, per-task timeouts, and shared deadlines. Supports abort signals for
 * cancellation and preserves result order regardless of completion timing.
 *
 * @example
 * ```ts
 * import { QueueAdapter } from '@orkestrel/core'
 * const queue = new QueueAdapter({ concurrency: 2, timeout: 1000 })
 * const results = await queue.run([
 *   async () => { await delay(100); return 1 },
 *   async () => { await delay(50); return 2 },
 *   async () => { await delay(200); return 3 },
 * ])
 * console.log(results) // => [1, 2, 3] (order preserved)
 * ```
 */
export class QueueAdapter<T = unknown> implements QueuePort<T> {
	private readonly items: T[] = []
	private readonly capacity?: number
	private readonly defaults: QueueRunOptions
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 * Construct a QueueAdapter with optional configuration defaults.
	 *
	 * @param options - Configuration options for queue behavior
	 * @param options.capacity - Maximum number of items the queue can hold (unlimited if not specified)
	 * @param options.concurrency - Default maximum number of tasks to run concurrently
	 * @param options.timeout - Default per-task timeout in milliseconds
	 * @param options.deadline - Default shared deadline in milliseconds for all tasks
	 * @param options.signal - Default AbortSignal for cancellation
	 * @param options.logger - Optional logger port for diagnostics
	 * @param options.diagnostic - Optional diagnostic port for telemetry
	 *
	 * @example
	 * ```ts
	 * const queue = new QueueAdapter({
	 *   concurrency: 5,
	 *   timeout: 2000,
	 *   capacity: 100
	 * })
	 * ```
	 */
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

	/**
	 * Access the logger port used by this queue adapter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Access the diagnostic port used by this queue adapter for telemetry and error signaling.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/**
	 * Enqueue a single item to the in-memory FIFO queue.
	 *
	 * @param item - The item to add to the queue
	 * @throws Error with code ORK1050 when capacity is set and would be exceeded
	 * @returns void
	 *
	 * @example
	 * ```ts
	 * await queue.enqueue({ id: 1, data: 'task payload' })
	 * ```
	 */
	async enqueue(item: T): Promise<void> {
		if (typeof this.capacity === 'number' && this.items.length >= this.capacity) {
			this.#diagnostic.fail('ORK1050', { scope: 'internal', message: 'QueueAdapter: capacity exceeded' })
		}
		this.items.push(item)
	}

	/**
	 * Dequeue and return the next item from the queue.
	 *
	 * @returns The next item in FIFO order, or undefined if the queue is empty
	 *
	 * @example
	 * ```ts
	 * const item = await queue.dequeue()
	 * if (item) console.log('Processing:', item)
	 * ```
	 */
	async dequeue(): Promise<T | undefined> { return this.items.length ? this.items.shift() : undefined }

	/**
	 * Return the current number of items in the queue.
	 *
	 * @returns The queue size
	 *
	 * @example
	 * ```ts
	 * const currentSize = await queue.size()
	 * console.log(`Queue has ${currentSize} items`)
	 * ```
	 */
	async size(): Promise<number> { return this.items.length }

	/**
	 * Run a set of tasks with optional concurrency control, timeouts, and a shared deadline.
	 *
	 * Tasks are executed with the specified concurrency limit (defaults to unlimited). Results are
	 * returned in the same order as the input tasks, regardless of completion timing. When both
	 * a per-task timeout and a shared deadline are provided, the effective limit is the minimum
	 * of the two for each task. If the shared deadline elapses or a task times out, execution
	 * aborts with an error (ORK1052 for task timeout, ORK1053 for shared deadline exceeded).
	 *
	 * @typeParam R - The return type of the tasks
	 * @param tasks - Array of task functions (sync or async) to execute
	 * @param options - Run options (overrides constructor defaults)
	 * @param options.concurrency - Maximum number of tasks to run concurrently
	 * @param options.timeout - Per-task timeout in milliseconds
	 * @param options.deadline - Shared deadline in milliseconds for all tasks
	 * @param options.signal - AbortSignal to cancel execution
	 * @returns Array of task results in the same order as input tasks
	 * @throws Error with code ORK1051 when aborted, ORK1052 on task timeout, or ORK1053 on shared deadline exceeded
	 *
	 * @example
	 * ```ts
	 * const results = await queue.run([
	 *   async () => fetchUser(1),
	 *   async () => fetchUser(2),
	 *   async () => fetchUser(3),
	 * ], { concurrency: 2, timeout: 5000 })
	 * console.log('Fetched users:', results)
	 * ```
	 */
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
							const e = diag.help(dueToShared ? 'ORK1053' : 'ORK1052', { scope: 'internal', message: dueToShared ? 'QueueAdapter: shared deadline exceeded' : `QueueAdapter: task #${idx} timed out` })
							reject(e)
						}, cap)
					}),
				])
			}
			finally {
				if (tId != null) clearTimeout(tId)
			}
		}

		if (opts.signal?.aborted) {
			const e = this.#diagnostic.help('ORK1051', { scope: 'internal', message: 'QueueAdapter: aborted' })
			return Promise.reject(e)
		}

		const worker = async () => {
			while (abortError == null) {
				if (opts.signal?.aborted) {
					abortError = this.#diagnostic.help('ORK1051', { scope: 'internal', message: 'QueueAdapter: aborted' })
					break
				}
				if (sharedEnd != null && Date.now() >= sharedEnd) {
					abortError = this.#diagnostic.help('ORK1053', { scope: 'internal', message: 'QueueAdapter: shared deadline exceeded' })
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
