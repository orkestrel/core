import type {
	DiagnosticAdapterOptions,
	DiagnosticPort,
	DiagnosticErrorContext,
	LoggerPort,
	LogLevel,
	LifecycleErrorDetail,
	MessageMapEntry,
} from '../types.js'
import { safeInvoke } from '../helpers.js'
import { LoggerAdapter } from './logger.js'

/** Internal base error class with code and helpUrl support. */
class BaseError extends Error {
	constructor(message: string, public code?: string, public helpUrl?: string) {
		super(message)
	}
}

/** Internal aggregate lifecycle error with details and errors arrays. */
class AggregateLifecycleError extends BaseError {
	constructor(message: string, public details: LifecycleErrorDetail[], public errors: Error[], code?: string, helpUrl?: string) {
		super(message, code, helpUrl)
	}
}

/**
 * Diagnostic adapter providing safe logging, error reporting, and telemetry.
 *
 * Acts as a delegator to a LoggerPort with keyed message overrides for consistent
 * log levels and messages. Provides methods for logging (log), error reporting (error),
 * error construction and throwing (fail), building errors without throwing (help),
 * aggregating lifecycle errors (aggregate), and telemetry (metric/trace/event).
 *
 * Never throws from safe methods (log, error, metric, trace, event). Only fail() and
 * aggregate() throw errors after logging them.
 *
 * @example
 * ```ts
 * import { DiagnosticAdapter, ORCHESTRATOR_MESSAGES } from '@orkestrel/core'
 *
 * const diag = new DiagnosticAdapter({ messages: ORCHESTRATOR_MESSAGES })
 * diag.log('info', 'orchestrator.phase', { phase: 'start' })
 *
 * // Build and throw an error with a code
 * try {
 *   diag.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
 * } catch (e) {
 *   console.error('Caught:', e.code, e.message)
 * }
 *
 * // Aggregate multiple errors
 * const errors = [new Error('task1 failed'), new Error('task2 failed')]
 * try {
 *   diag.aggregate('ORK1017', errors, { scope: 'orchestrator', message: 'Errors during destroy' })
 * } catch (e) {
 *   // e is an AggregateLifecycleError with .details and .errors
 * }
 * ```
 */
export class DiagnosticAdapter implements DiagnosticPort {
	readonly #logger: LoggerPort
	/** Keyed message overrides, seeded with defaults then user overrides. */
	readonly #messages: ReadonlyMap<string, MessageMapEntry>

	/**
	 * Construct a DiagnosticAdapter with optional logger and message overrides.
	 *
	 * @param options - Configuration options
	 * @param options.logger - Optional logger port for emitting log entries (default: LoggerAdapter)
	 * @param options.messages - Array of diagnostic messages with keys, levels, and message templates
	 *
	 * @example
	 * ```ts
	 * import { DiagnosticAdapter, LIFECYCLE_MESSAGES } from '@orkestrel/core'
	 * const diag = new DiagnosticAdapter({
	 *   logger: customLogger,
	 *   messages: LIFECYCLE_MESSAGES
	 * })
	 * ```
	 */
	constructor(options?: DiagnosticAdapterOptions) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		// Only seed with provided messages (domain-specific maps supplied by callers)
		const m = new Map<string, MessageMapEntry>()
		for (const d of options?.messages ?? []) m.set(d.key, { level: d.level, message: d.message })
		this.#messages = m
	}

	/**
	 * Access the logger port used by this diagnostic adapter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	// ---------------------------
	// Public API (DiagnosticPort)
	// ---------------------------

	/**
	 * Write a log entry with a level, message key, and optional structured fields.
	 *
	 * The message key is resolved via the internal message map to determine the final
	 * log level and message template. Delegates to the logger port and never throws.
	 *
	 * @param level - Fallback log level when the key is not found in the message map
	 * @param message - Message key or literal message string
	 * @param fields - Optional structured data to include with the log entry
	 *
	 * @example
	 * ```ts
	 * diag.log('info', 'orchestrator.phase', { phase: 'start', layer: 1 })
	 * diag.log('error', 'ORK1007', { scope: 'orchestrator' })
	 * ```
	 */
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		const resolved = this.resolve(message, { level, message })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? level, resolved.message ?? message, fields)
	}

	/**
	 * Report an error to the logger with optional context fields.
	 *
	 * Does not throw; logs the error with structured context. Use fail() to build and throw
	 * an error with a code. Coerces non-Error values to Error instances.
	 *
	 * @param err - Error instance or value to report
	 * @param context - Optional structured context including code, scope, and extra fields
	 *
	 * @example
	 * ```ts
	 * try {
	 *   await riskyOperation()
	 * } catch (e) {
	 *   diag.error(e, { scope: 'orchestrator', code: 'ORK1013' })
	 * }
	 * ```
	 */
	error(err: unknown, context: DiagnosticErrorContext = {}): void {
		const e = err instanceof Error ? err : new Error(String(err))
		const key = String(context.code ?? e.name ?? 'error')
		const resolved = this.resolve(key, { level: 'error', message: e.message })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'error', resolved.message ?? e.message, { err: this.shapeErr(e), ...context })
	}

	/**
	 * Build an Error using a key/code, log it, and throw it.
	 *
	 * Resolves the key in the message map to determine the log level and message template.
	 * Constructs an error with optional code and helpUrl properties, logs it, then throws.
	 *
	 * @param key - Code or message key (e.g., 'ORK1007') used to resolve message and severity
	 * @param context - Optional structured context including message override, helpUrl, name, and scope
	 * @throws Error with optional .code and .helpUrl properties
	 *
	 * @example
	 * ```ts
	 * if (isDuplicate) {
	 *   diag.fail('ORK1007', {
	 *     scope: 'orchestrator',
	 *     message: 'Duplicate registration',
	 *     helpUrl: 'https://example.com/errors#ORK1007'
	 *   })
	 * }
	 * ```
	 */
	fail(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = overrideMsg ?? entry?.message ?? key
		const e = this.buildError(key, msg, { helpUrl, name, context: rest })
		// Emit and throw; include code when it is an ORK*-style code or explicitly provided.
		safeInvoke(this.#logger.log.bind(this.#logger), level, msg, { err: this.shapeErr(e), ...rest, ...(e.code ? { code: e.code } : {}) })
		throw e
	}

	/**
	 * Build an Error using a known key/code without throwing.
	 *
	 * Useful when you need to construct an error to attach to other structures or pass
	 * to callbacks. Does not log or throw the error.
	 *
	 * @param key - Code or message key used to resolve the error message
	 * @param context - Optional context including message override, helpUrl, and name
	 * @returns Constructed Error instance with optional code and helpUrl properties
	 *
	 * @example
	 * ```ts
	 * const timeoutErr = diag.help('ORK1021', {
	 *   message: 'Hook onStart timed out',
	 *   helpUrl: HELP.lifecycle
	 * })
	 * return Promise.reject(timeoutErr)
	 * ```
	 */
	help(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): Error {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const msg = overrideMsg ?? entry?.message ?? key
		return this.buildError(key, msg, { helpUrl, name, context: rest })
	}

	/**
	 * Build and throw an aggregate error from a collection of lifecycle details or errors.
	 *
	 * Normalizes mixed arrays of LifecycleErrorDetail and Error instances into a uniform
	 * details array, constructs an AggregateLifecycleError, logs it, and throws. The thrown
	 * error includes .details and .errors arrays for inspection.
	 *
	 * @param key - Code used for the aggregate error (e.g., 'ORK1013', 'ORK1014', 'ORK1015')
	 * @param detailsOrErrors - Array of LifecycleErrorDetail and/or Error instances to aggregate
	 * @param context - Optional message override, helpUrl, and other context fields
	 * @throws AggregateLifecycleError with .details and .errors arrays
	 *
	 * @example
	 * ```ts
	 * const failures: LifecycleErrorDetail[] = [...]
	 * diag.aggregate('ORK1013', failures, {
	 *   scope: 'orchestrator',
	 *   message: 'Errors during start phase',
	 *   helpUrl: HELP.orchestrator
	 * })
	 * ```
	 */
	aggregate(key: string, detailsOrErrors: ReadonlyArray<LifecycleErrorDetail | Error>, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const details = this.normalizeAggregateDetails(detailsOrErrors)
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = (context.message ?? entry?.message ?? key)
		const e = new AggregateLifecycleError(msg, details, details.map(d => d.error))
		// prefer code if provided or if key is ORK-like
		e.code = context.code ?? (/^ORK\d{4}$/.test(key) ? key : key)
		if (context.helpUrl) e.helpUrl = context.helpUrl
		if (context.name) e.name = context.name
		safeInvoke(this.#logger.log.bind(this.#logger), level, msg, { err: this.shapeErr(e), ...context, details })
		throw e
	}

	/**
	 * Emit a metric with a numeric value and optional tags.
	 *
	 * Resolves the metric name in the message map, logs with the resolved level and message,
	 * and includes the numeric value and tags as structured fields.
	 *
	 * @param name - Metric name (e.g., 'queue.size', 'http.latency')
	 * @param value - Numeric metric value
	 * @param tags - Optional key-value tags for filtering and grouping
	 *
	 * @example
	 * ```ts
	 * diag.metric('queue.size', 42, { queueName: 'tasks', priority: 'high' })
	 * diag.metric('http.latency', 125.5, { endpoint: '/api/users' })
	 * ```
	 */
	metric(name: string, value: number, tags: Record<string, string | number | boolean> = {}): void {
		const resolved = this.resolve(name, { level: 'info', message: name })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'info', resolved.message ?? name, { value, ...tags })
	}

	/**
	 * Emit a trace-level payload for detailed debugging.
	 *
	 * Resolves the trace name in the message map and logs at debug level with the provided
	 * payload as structured fields.
	 *
	 * @param name - Trace name (e.g., 'lifecycle.transition', 'orchestrator.layers')
	 * @param payload - Optional structured data for the trace entry
	 *
	 * @example
	 * ```ts
	 * diag.trace('lifecycle.transition', { from: 'created', to: 'started' })
	 * diag.trace('orchestrator.layers', { layers: [[A], [B, C]] })
	 * ```
	 */
	trace(name: string, payload: Record<string, unknown> = {}): void {
		const resolved = this.resolve(name, { level: 'debug', message: name })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'debug', resolved.message ?? name, payload)
	}

	/**
	 * Emit a general event payload for analytics or telemetry.
	 *
	 * Resolves the event name in the message map and logs at info level with the provided
	 * payload as structured fields. Used for application events, not errors or traces.
	 *
	 * @param name - Event name (e.g., 'lifecycle.hook', 'orchestrator.component.start')
	 * @param payload - Optional structured event data
	 *
	 * @example
	 * ```ts
	 * diag.event('lifecycle.hook', { hook: 'onStart', state: 'started' })
	 * diag.event('orchestrator.component.start', { token: 'Database', layer: 0 })
	 * ```
	 */
	event(name: string, payload: Record<string, unknown> = {}): void {
		const resolved = this.resolve(name, { level: 'info', message: name })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'info', resolved.message ?? name, payload)
	}

	// ---------------------------
	// Internals
	// ---------------------------

	/** Resolve a message key to level and message using the message map with a fallback. */
	private resolve(key: string, fallback: MessageMapEntry): MessageMapEntry {
		const entry = this.#messages.get(key)
		return entry ? { level: entry.level ?? fallback.level, message: entry.message ?? fallback.message } : fallback
	}

	/** Shape an Error into a serializable object for logging. */
	private shapeErr(e: Error): { name: string, message: string, stack?: string } {
		return { name: e.name, message: e.message, stack: e.stack }
	}

	/** Build a BaseError with code and helpUrl. */
	private buildError(key: string, message: string, opts: { helpUrl?: string, name?: string, context?: DiagnosticErrorContext }): BaseError {
		const { helpUrl, name, context } = opts
		const orkLike = /^ORK\d{4}$/.test(key) ? key : undefined
		const code = context?.code ?? orkLike ?? key
		const e = new BaseError(message, code, helpUrl)
		if (name) e.name = name
		return e
	}

	/** Normalize a mixed array of LifecycleErrorDetail and Error instances into uniform details. */
	private normalizeAggregateDetails(items: ReadonlyArray<LifecycleErrorDetail | Error>): LifecycleErrorDetail[] {
		const out: LifecycleErrorDetail[] = []
		for (const it of items) {
			if (it instanceof Error) {
				out.push({ tokenDescription: 'unknown', phase: 'start', context: 'normal', timedOut: false, durationMs: 0, error: it })
			}
			else {
				out.push(it)
			}
		}
		return out
	}
}
